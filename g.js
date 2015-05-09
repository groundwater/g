#!/usr/bin/env babel-node

import {split, join, basename, dirname}  from 'path'
import {parse}  from 'ssh-url'
import {spawn}  from 'child_process'
import minimist from 'minimist'
import mkdirp   from 'mkdirp'

const HOME = process.env.G_PROJECT_ROOT || join(process.env.HOME, 'Projects')
const args = minimist(process.argv.slice(2))
const cmd = args._.shift()

switch(cmd) {
case 'clone':
  return clone(args)
default:
  return usage(1)
}

function usage(status) {
  console.log(`Usage: ${process.argv[0]} [OPTIONS] CMD [ARGS]`)
  process.exit(status)
}

function clone(args) {
  let rawUrl = args._.shift()
  let {hostname, pathname, user} = parse(rawUrl)
  let dirName = join(dirname(pathname), basename(pathname, '.git'))

  let projPath = join(HOME, hostname, dirName)

  console.log(`Creating ${projPath}`)

  mkdirp(projPath, err => {
    if (err) throw err

    spawn('git', ['clone', rawUrl, projPath], {stdio: 'inherit'})
    .on('exit', (code, signal) => {
      process.exit(code)
    })
  })
}
