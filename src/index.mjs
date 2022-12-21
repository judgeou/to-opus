import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import promiseLimit from 'promise-limit'

async function main () {
    const { argv } = process
    const plimit = promiseLimit(4)

    if (argv.length >= 3) {
        const INPUT_DIR = argv[2]
        const OUTPUT_DIR = path.resolve(INPUT_DIR + '_opus')
        const files = await list_files(INPUT_DIR)

        await fs.ensureDir(OUTPUT_DIR)

        let i = 0

        await Promise.all(files.map(file => plimit(async () => {
            const input = file
            const output = path.resolve(OUTPUT_DIR, path.basename(input, path.extname(input)) + '.opus')
            const options = ['-b:a', '256k']

            i++
            console.log(`[${i} / ${files.length}] ${file}`);
            await convertMusic(input, output, options)
        })))

    } else {
        console.log('need input directory');
    }
}

async function convertMusic (input, output, options) {
    let args = [ '-y', '-i', input, ...options, output ]
    let ffmpeg = spawn('ffmpeg', args)

    ffmpeg.stdout.pipe(process.stdout)
    ffmpeg.stderr.pipe(process.stderr)

    return new Promise((r, reject) => {
        ffmpeg.on('close', code => {
            if (code === 0) {
                r(true)
            } else {
                reject(false)
            }
        })
    })
}

function changeExt (filepath) {
    return filepath.replace(/\.[^.]+$/, '.opus')
}

async function list_files (dir) {
    let result = []
    const files = await fs.readdir(dir)

    for (let file of files) {
        let filepath = path.resolve(dir, file)
        let stat = await fs.stat(filepath)

        if (stat.isDirectory()) {
            result = [...await list_files(filepath)]
        } else {
            if (path.extname(filepath) === '.flac') {
                result.push(filepath)
            }
        }
    }

    return result
}

export {
    main
}