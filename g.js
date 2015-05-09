#!/usr/bin/env babel-node

import {split, join, basename, dirname}  from 'path'
import {parse}  from 'ssh-url'
import {spawn}  from 'child_process'
import minimist from 'minimist'
import mkdirp   from 'mkdirp'
import glob     from 'glob'

const HOME = process.env.G_PROJECT_ROOT || join(process.env.HOME, 'Projects')
const args = minimist(process.argv.slice(2))
const cmd = args._.shift()

switch(cmd) {
case 'clone':
  return clone(args)
case 'sh':
  return sh(args)
default:
  return usage(1)
}


function sh(args) {
  let query = args._.shift()
  let [three, two='*', one='*'] = query.split('/').reverse()
  let search = `${one}/${two}/*${three}`
  let opts = {
    cwd: HOME,
  }

  glob(search, opts, (err, list) => {
    if (list.length === 0) {
      console.log(`No Matches Found in ${HOME}`)
    }
    else if (list.length > 1) {
      console.log('Multiple Matches:')
      list.forEach(item => {
        console.log(item)
      })
    }
    else {
      let env = {}
      let cwd = join(HOME, list[0])
      let bins = `${cwd}/node_modules/.bin`
      let newBin = join(HOME, bins)

      Object.assign(env, process.env)

      env.PATH = `${newBin}:${env.PATH}`

      console.log(`Directory ${cwd}`)
      console.log(`Adding $PATH ${bins}`)

      spawn('bash', [], {stdio: 'inherit', cwd, env})
      .on('exit', code => {
        console.log('Exited', code)
      })
      .on('error', err => {
        console.error(err)
      })
    }
  })
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
