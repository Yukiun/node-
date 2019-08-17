// 系统标准库放在前面
const fs = require('fs')

// 接着放第三方库
const request = require('syncrequest')
const cheerio = require('cheerio')

// 最后放自己写的模块
const log = console.log.bind(console)

// ES6 定义一个类
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

// class Movie {
//     constructor() {
//         // 分别是电影名/评分/引言/排名/封面图片链接
//         this.Name = ''
//         this.scores = 0
//         this.quote = ''
//         this.ranking = 0
//         this.cover_url = ''
//         this.other_name = ''
//     }
// }

// Model
const clean = (movie) => {
    let m = movie
    let o = {
        name: m.Name,
        score: m.scores,
        quote: m.quote,
        ranking: m.ranking,
        coverUrl: m.cover_url,
        otherNames: m.other_name,
    }
    return o
}

const movieFromDiv = (div) => {
    // cheerio.load 不仅可以接收 HTML 格式的字符串当参数,
    // 还能接收 DOM 元素当参数
    // https://cnodejs.org/topic/5203a71844e76d216a727d2e
    let e = cheerio.load(div)

    // 创建一个电影类的实例并且获取数据
    // 这些数据都是从 html 结构里面人工分析出来的
    let movie = new Movie()
    // .text() 方法相当于 .innerText 属性, 获取元素的文本内容
    movie.name = e('.title').text()
    // movie.score = e('.rating_num').text()
    let span = e('.star').find('span')
    // log('span length', span.eq(1).text())
    movie.score = Number(span.eq(1).text())
    movie.quote = e('.inq').text()
    let other = e('.other').text()
    movie.otherNames = other.slice(3).split(' / ').join('|')

    let pic = e('.pic')
    // find 函数是指在一个 DOM 元素内部查找其他 DOM 元素的方法
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
    // 如果存在就读取缓存文件
    // 如果不存在就下载并且写入缓存文件
    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let s = fs.readFileSync(cacheFile)
        return s
    } else {
        // 用 GET 方法获取 url 链接的内容
        // 相当于你在浏览器地址栏输入 url 按回车后得到的 HTML 内容
        let r = request.get.sync(url)
        // r.body 是响应的 body 部分, 对应 HTTP Response Body
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
    // cheerio.load 用来把 HTML 文本解析为一个可以操作的 DOM Tree
    // 返回值是一个函数, 可以直接调用
    // 作用和上课实现的 e 函数/ es 函数比较像
    let e = cheerio.load(body)

    // 一共有 25 个 .item
    let movieDivs = e('.item')
    log('movieDivs length', movieDivs.length)
    // 循环处理 25 个 .item
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        // 扔给 movieFromDiv 函数来获取到一个 movie 对象
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

const saveMovie = (movies) => {
    // JSON.stringify 第 2 3 个参数配合起来是为了让生成的 json
    // 数据带有缩进的格式，第三个参数表示缩进的空格数
    // 建议当套路来用
    // 如果你一定想要知道原理，看下面的链接（不建议看）
    // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
    let s = JSON.stringify(movies, null, 2)
    // 把 json 格式字符串写入到 文件 中
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


// console.time 和 console.timeEnd 是一对用来测试程序运行时间的函数
// 要求这两个函数的参数完全一致
console.time('main')
__main()
console.timeEnd('main')

// 爬虫程序一定要先缓存

// https://movie.douban.com/top250?start=0&filter=
// https://movie.douban.com/top250?start=75&filter=
// https://movie.douban.com/top250?start=100&filter=
