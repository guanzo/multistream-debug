const { PassThrough } = require('stream')
const { promisify } = require('util')

const axios = require('axios')
const MultiStream = require('multistream')
const ffprobePath = require('@ffprobe-installer/ffprobe').path
const ffmpeg = require('fluent-ffmpeg')

ffmpeg.setFfprobePath(ffprobePath)
const ffprobeAsync = promisify(ffmpeg.ffprobe)

const cl = console.log

async function run () {
    const url = 'https://storage.arc.io/arc/homepage_demo_files/vacations.mp4'
    const res = await axios.get(url, { responseType: 'stream' })
    const contentLength = Number(res.headers['content-length'])

    const tee = new PassThrough()
    const lenPass = new PassThrough()
    const ffmpegPass = new PassThrough()

    res.data.pipe(tee)
    tee.pipe(lenPass)
    tee.pipe(ffmpegPass)

    const p1 = ffprobeAsync(ffmpegPass).then(metadata => {
        tee.unpipe(ffmpegPass)
        // ffmpegPass.destroy()
        return metadata
    })

    const p2 = new Promise(resolve => {
        let len = 0
        lenPass.on('data', chunk => {
            len += chunk.length
        })
        lenPass.on('end', () => {
            resolve(len)
        })
    })

    const [res1, length] = await Promise.all([p1, p2])

    console.log(contentLength, length)
    if (contentLength !== length) {
        cl('LENGTH MISMATCH')
    } else {
        cl('okay')
    }
}

run()
