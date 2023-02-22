const { exec } = require('child_process');
const os = require('os');
const iconv = require('iconv-lite');
let getProcessTreeWin;
try {
  getProcessTreeWin = require('./windows-process-tree/lib/index').getProcessTree;
} catch (error) {
  getProcessTreeWin = undefined;
}


function getAllProcessWin(props) {
  // wmic 的输出列顺序是按 prop的字典序
  props = props || [
    'CommandLine',
    'Name',
    'ParentProcessId',
    'ProcessId',
    'WorkingSetSize',
  ];
  const propToKeyWin = {
    CommandLine: 'cmd',
    Name: 'name',
    ParentProcessId: 'ppid',
    ProcessId: 'pid',
    WorkingSetSize: 'mem',
  };
  const cmd = `wmic process get ${props.join(',')}`;
  const result = [];
  const n = props.length;
  return new Promise((rs, rj) => {
    // slowly
    exec(cmd, { ncoding: 'binary', maxBuffer: 1024 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        rs([]);
      }

      stdout = iconv.decode(Buffer.from(stdout, 'binary'), 'cp936');

      const lines = stdout.trim().split(os.EOL);
      if (lines.length < 2) {
        return rs([]);
      }
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const item = {};
        if (line == '') continue;
        // wmic 输出各项之间间隔至少两个空格
        const values = line.split(/\s{2,}/);
        // CommandLine可能为空
        if (values.length != n) {
          values.splice(0, 0, '');
        }
        for (let i = 0; i < n; i++) {
          item[`${propToKeyWin[props[i]]}`] = values[i];
        }

        result.push(item);
      }
      rs(result);
    });
  });
}

function getAllProcessMac(props) {
  props = props || [
    'pid',
    'ppid',
    'comm',
    'rss',
    'args',
  ];
  const propToKeyMac = {
    args: 'cmd',
    comm: 'name',
    ppid: 'ppid',
    pid: 'pid',
    rss: 'mem',
  };
  const cmd = `ps -awwxo ${props.join(',')}`;
  const result = [];
  const n = props.length;
  return new Promise((rs, rj) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        rs([]);
      }
      const lines = stdout.trim().split(os.EOL);
      if (lines.length < 2) {
        return rs([]);
      }
      const headers = lines[0].trim().toLowerCase()
        .split(/\s+/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const item = {};
        if (line == '') continue;
        const values = line.split(/\s+/);
        let args = '';
        // args 中有空格
        if (values.length != n) {
          args = values.slice(4).join(' ');
        } else {
          args = values[4];
        }
        item[propToKeyMac.args] = args;
        for (let i = 0; i < n - 1; i++) {
          item[`${propToKeyMac[headers[i]]}`] = values[i];
        }

        result.push(item);
      }
      rs(result);
    });
  });
}

function buildProcessTree(rootPid, processList, maxDepth) {
  const rootProcess = processList.find(p => p.pid === rootPid || p.pid === `${rootPid}`);
  if (!rootProcess) {
    return undefined;
  }
  const childProcesses = processList.filter(p => p.ppid === rootPid || p.ppid === `${rootPid}`);
  return {
    pid: rootPid,
    name: rootProcess.name,
    memory: rootProcess.mem,
    commandLine: rootProcess.cmd,
    children: maxDepth === 0 ? [] : childProcesses.map(p => buildProcessTree(p.pid, processList, maxDepth - 1)),
  };
}


async function getProcessTree(root) {
  // windows, we use windows-process-tree, it's vvvvvvery fast
  if (process.platform === 'win32') {
    return await new Promise((rs, rj) => {
      (getProcessTreeWin && getProcessTreeWin(root, (tree) => {
        rs(tree);
      }, 3)) || (getProcessTreeWin || rs({}));
    });
  }
  return buildProcessTree(root, await getAllProcessMac(), 10);
}


module.exports = {
  getProcessTree,
  getAllProcess: () => (process.platform === 'win32' ? getAllProcessWin() : getAllProcessMac()),
};
