#!/usr/bin/env babel-node

import 'babel/polyfill'
import {createReadStream} from 'fs'
import {split, join, basename, dirname}  from 'path'
import {parse}  from 'ssh-url'
import {spawn}  from 'child_process'
import minimist from 'minimist'
import mkdirp   from 'mkdirp'
import glob     from 'glob'
import Github   from 'github-api'
import assert   from 'assert'

const HOME = process.env.G_PROJECT_ROOT || join(process.env.HOME, 'Projects')
const args = minimist(process.argv.slice(2))

main()

function main() {
  const cmd = args._.shift()

  if (args.h || args.help) return help()

  switch(cmd) {
  case 'clone':
    return clone(args)
  case 'sh':
    return sh(args)
  case 'create':
    return create(args)
  case 'list':
    return list()
  case 'help':
    return help()
  default:
    return usage(1)
  }
}

function list() {
  let query = args._.shift()
  let [three='*', two='*', one='*'] = query ? query.split('/').reverse() : []
  let search = `${one}/${two}/${three}`

  glob(search, {cwd: HOME}, (err, list) => {
    if (err) throw err

    list.forEach(item => console.log(item))
  })
}

function create(args) {
  const password = process.env.G_GITHUB_TOKEN
  const username = process.env.G_GITHUB_USER

  assert(username, 'please set G_GITHUB_USER')
  assert(password, 'please set G_GITHUB_TOKEN')

  let gh = new Github({token:password, auth:'oauth'})

  let name = args._.shift()
  let pathname = `github.com/${username}/${name}`
  let projPath = join(HOME, pathname)

  mkdirp(projPath, err => {
    if (err) throw console.error(err)

    gh.getUser().createRepo({name}, (err, res) => {
      if (err) throw console.error(err)

      clone({_:[`git@github.com:${username}/${name}`]})
    })
  })
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

      env.PATH         = `${newBin}:${env.PATH}`
      env.HISTFILE     = `${cwd}/.git/bash_history`
      env.HISTSIZE     = -1
      env.HISTFILESIZE = -1
      env.GIT_PS1_SHOWCOLORHINTS = 1
      env.GIT_PS1_SHOWDIRTYSTATE = 1
      env.GIT_PS1_SHOWUNTRACKEDFILES = 1
      env.GIT_PS1_SHOWUPSTREAM = 'git'

      let WHITE = '\\e[0;37m'
      let GREEN = '\\e[0;32m'
      let GRAY  = '\\e[0;90m'
      let CLEAR = '\\e[0m'

      env.PS1 = `${GRAY}Project: ${WHITE}(${list[0]})${CLEAR}$(__git_ps1)
[\\!]> `

      console.log(`Directory ${cwd}`)
      console.log(`Adding $PATH ${bins}`)

      let proc = spawn('bash', ['--rcfile', __dirname + '/git-prompt.sh'], {stdio: 'inherit', cwd, env})

      proc.on('exit', code => {
        console.log('Goodbye!', code||'')
      })
      proc.on('error', err => {
        console.error(err)
      })

    }
  })
}

function help() {
  createReadStream(join(__dirname, 'usage.txt')).pipe(process.stdout)
}

function usage(status) {
  console.log(`Usage: g [OPTIONS] CMD [ARGS]`)
  console.log(`Help : g -h`)
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
