/**
 * Created by 忍把浮名换此生 on 2017/6/20.
 */
var url = require('url'),
  superagent = require('superagent'),
  cheerio = require('cheerio'),
  async = require('async'),
  eventproxy = require('eventproxy'),
  mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/myShici');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback) {
  console.log('成功连接到数据库');
});
//模型
var shiciSchema = mongoose.Schema({
  name: String,
  dynasty: String,
  author: String,
  content: String
});
var shici = mongoose.model('shici', shiciSchema);
var ep = new eventproxy(),
  urlsArray = [],
  pageUrls = [],
  pageNum = 666,
  shiciNum = 100000;
for (var i = 1; i < pageNum + 1; i++) {
  pageUrls.push('http://www.shicimingju.com/chaxun/zuozhe/' + i);
}
function start() {
  var xNum = 1;
  var indexNum = 1;
  var getHtmlUrl = function(xNum, url) {
    var xUrl = url + '_' + xNum + '.html#chaxun_miao';
    superagent.get(xUrl).end(function(err, pres) {
      xNum++;
      if (!err) {
        var $ = cheerio.load(pres.text);
        var xTitle = $('.jianjie>h1');
        var pattern = new RegExp('暂未收录的古诗');
        if (!pattern.test(xTitle.text())) {
          var curPageUrls = $('.shicilist ul li:first-child>a:first-child');
          for (var i = 0; i < curPageUrls.length; i++) {
            if (urlsArray.length < shiciNum) {
              indexNum++;
              var articleUrl = curPageUrls.eq(i).attr('href');
              console.log(indexNum, 'http://www.shicimingju.com' + articleUrl);
              urlsArray.push('http://www.shicimingju.com' + articleUrl);
              ep.emit('BlogArticleHtml', articleUrl);
            }
          }
          if (urlsArray.length < shiciNum) {
            getHtmlUrl(xNum, url);
          }
        }
      }
    });
  };
  pageUrls.forEach(function(url) {
    getHtmlUrl(xNum, url);
  });
  ep.after('BlogArticleHtml', shiciNum, function(articleUrls) {
    var curCount = 0;
    var shuliang = 1;
    var reptileMove = function(url, callback) {
      curCount++;
      var delay = parseInt((Math.random() * 30000000) % 1000);
      superagent.get(url).end(function(err, sres) {
        if (err) {
          console.log(err);
          return;
        }
        shuliang++;
        var $ = cheerio.load(sres.text);
        if ($ && $ !== null) {
          var name = $('.zhuti>h2').text() || '未知';
          var dynasty = $('.jjzz>a:first-child').text() || '未知';
          var author = $('.jjzz>a:last-child').text() || '未知';
          var content = $('#shicineirong').text() || '未知';
          var thisShici = new shici({
            name: name,
            dynasty: dynasty,
            author: author,
            content: content
          });
          thisShici.save(function(err, fluffy) {
            if (err) return console.error(err);
            console.log(url);
            console.log('成功存储' + author + '《' + name + '》');
          });
        }
      });
      setTimeout(function() {
        curCount--;
        callback();
      }, delay);
    };
    async.mapLimit(
      urlsArray,
      10,
      function(url, callback) {
        reptileMove(url, callback);
      },
      function(err) {
        if (!err) {
          console.log('收取结束');
        }
      }
    );
  });
}
start();
