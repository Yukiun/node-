const fs = require('fs')

const request = require('syncrequest')
const cheerio = require('cheerio')

// 最后放自己写的模块
const log = console.log.bind(console)

class Movie {
    constructor() {
        // 分别是电影名/评分/引言/排名/封面图片链接
        this.name = ''
        this.score = 0
        this.quote = ''
        this.ranking = 0
        this.coverUrl = ''
    }
}

const movieFromDiv = (div) => {
    // cheerio.load 不仅可以接收 HTML 格式的字符串当参数,
    // 还能接收 DOM 元素当参数
    let e = cheerio.load(div)

    let movie = new Movie()
    movie.name = e('.title').text()
    let span = e('.star').find('span')
    movie.score = Number(span.eq(1).text())
    movie.quote = e('.inq').text()
    let other = e('.other').text()
    movie.otherNames = other.slice(3).split(' / ').join('|')

    let pic = e('.pic')
    movie.ranking = Number(pic.find('em').text())
    // .attr('src') 相当于 .src 属性
    movie.coverUrl = pic.find('img').attr('src')

    return movie
}

const ensurePath = (dir) => {
    let exists = fs.existsSync(dir)
    if (!exists) {
        // 创建目录
        fs.mkdirSync(dir)
    }
}

const cachedUrl = (url) => {
    let dir = 'cached'
    ensurePath(dir)

    // 1. 确定缓存的文件名称
    let cacheFile = dir + '/' + url.split('?')[1] + '.html'
    // 2. 检查缓存文件是否存在
    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let s = fs.readFileSync(cacheFile)
        return s
    } else {
        let r = request.get.sync(url)
        let body = r.body
        // 在返回之前先写入缓存
        fs.writeFileSync(cacheFile, body)
        return body
    }
}

const moviesFromUrl = (url) => {
    // 调用 cachedUrl 来获取 HTML 数据
    let body = cachedUrl(url)
    log('body', typeof body)
    let e = cheerio.load(body)

    // 一共有 25 个 .item
    let movieDivs = e('.item')
    log('movieDivs length', movieDivs.length)
    // 循环处理 25 个 .item
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

const saveMovie = (movies) => {
    let s = JSON.stringify(movies, null, 2)
    let path = 'douban.json'
    fs.writeFileSync(path, s)
}

const downloadCovers = (movies) => {
    let dir = 'covers'
    ensurePath(dir)
    const request = require('request')
    for (let i = 0; i < movies.length; i++) {
        let m = movies[i]
        let url = m.coverUrl
        // 保存图片的路径
        let path = dir + '/' + m.ranking + '_' + m.name.split('/')[0] + '.jpg'
        // 下载并且保存图片的套路
        request(url).pipe(fs.createWriteStream(path))
    }
}

const __main = () => {
    let movies = []
    for (let i = 0; i < 10; i++) {
        let start = i * 25
        let url = `https://movie.douban.com/top250?start=${start}&filter=`
        let moviesInPage = moviesFromUrl(url)
        // movies = movies.concat(moviesInPage)
        movies = [...movies, ...moviesInPage]
    }
    saveMovie(movies)
    downloadCovers(movies)
    log('抓取成功, 数据已经写入到 douban.json 中')
}


console.time('main')
__main()
console.timeEnd('main')

