### process-tree

[![npm](https://img.shields.io/npm/v/processp-tree-info)](https://www.npmjs.com/package/processp-tree-info)
![author](https://img.shields.io/badge/author-xiaotuoyang-red.svg)

### Install
`npm i processp-tree-info`

### Usage

```
const {getProcessTree, getAllProcess} = require("processp-tree-info")

;(async function() {
    console.log(await getAllProcess())
    console.log(await getProcessTree(process.pid))
})()

```
