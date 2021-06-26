// See LICENSE for usage information

// The following lines allow the ping function to be loaded via commonjs, AMD,
// and script tags, directly into window globals.
// Thanks to https://github.com/umdjs/umd/blob/master/templates/returnExports.js
(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.ping = factory(); }
}(this, function () {

    /**
     * Creates and loads an image element by url.
     * @param  {String} url
     * @return {Promise} promise that resolves to an image element or
     *                   fails to an Error.
     */
    function request_image(url) {
        return new Promise(function(resolve, reject) {
            var img = new Image();
            img.onload = function() { resolve(img); };
            img.onerror = function() { reject(url); };
            img.src = url + '?random-no-cache=' + Math.floor((1 + Math.random()) * 0x10000).toString(16);
        });
    }

    /**
     * Pings a url.
     * @param  {String} url
     * @param  {Number} multiplier - optional, factor to adjust the ping by.  0.3 works well for HTTP servers.
     * @return {Promise} promise that resolves to a ping (ms, float).
     */
    function ping(url, multiplier) {
        return new Promise(function(resolve, reject) {
            var start = (new Date()).getTime();
            var response = function() { 
                var delta = ((new Date()).getTime() - start);
                delta *= (multiplier || 1);
                resolve(delta); 
            };
            request_image(url).then(response).catch(response);
            
            // Set a timeout for max-pings, 5s.
            setTimeout(function() { reject(Error('Timeout')); }, 5000);
        });
    }
    
    return ping;
}));

var numberUnits = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s', 'ZH/s', 'YH/s'];

var niceNames = ['vtc-fl.javerity.com', 'vtc-ca.javerity.com', 'boofpool.ddns.net', 'acidpool.xyz', 'mindcraftblocks.com', 'pi.p2pminers.nl', 'vtc.p2pminers.nl', 'p2p-usa.xyz', 'fr1.vtconline.org', 'p2p-spb.xyz', 'p2p-ekb.xyz', 'p2p-south.xyz','vtc.bbqdroid.org','vtc.rocrypto.org','syberia.mine.nu'];

// Used for the DNS Lookups for friendly names
var dnsPromises = [];

// Used for the DNS Lookups for friendly names - yes, i know, i'm an idiot.
var namedIPs = [];

async function getIPfromName(dnsname) {
  var response = await fetch('https://dns.google/resolve?name=' + dnsname + '&type=A');
  var json = response.json();
  return json;
};

function searchNamesByIP(ipaddr) {
  let dnsname = namedIPs.find(dnsname => dnsname.ip == ipaddr);
  if (dnsname) {
    return dnsname.name.slice(0, -1); // cheezy way to remove the . from the response
  } else {
    return ipaddr;
  }
}

var niceNumber = function niceNumber(nn) {
  var n = nn;
  var i = 0;
  while (n >= 1000) {
    if (i + 1 >= numberUnits.length) {
      return Math.round(n * 1000) / 1000 + ' ' + numberUnits[i];
    }
    n /= 1000;
    i += 1;
  }
  return n.toFixed(3) + ' ' + numberUnits[i];
};

/* global $*/
var getlist = function getlist(options) {
  $.support.cors = true;
  $('#sortTable > tbody').empty();
  //$('#info').empty();
  $.ajax({
    type: 'GET',
    url: '/' + options,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    cache: false,
    success: function success(data) {
      var pHTML = '';
      pHTML += '<h2>' + data.currency + ' P2Pool global stats</h2>';
      //pHTML += '<p>Global pool speed: ' + niceNumber(data.pool_speed) + ' (est. good shares: ' + data.est_good_shares + '%)</p>';
      pHTML += '<p>Currently observing ' + data.nodes_total + ' nodes.</p>';
      pHTML += '<p>' + data.public_nodes + ' public nodes (' + niceNumber(data.totalHashRate);
      pHTML += ', good shares: ' + data.good_shares + '%';
      pHTML += ', ' + data.totalUsers;
      pHTML += ' total miners)</p>';
      $('#stats').html(pHTML);
      $('#miner').html(pHTML);
      $.each(data.info, function (i, info) {
        var img = info.geo.code ? 'https://geoiptool.com/static/img/flags/' + info.geo.code.toLowerCase() + '.gif' : '';
        var id = info.ip + ':' + info.port;
        var nodename = searchNamesByIP(info.ip);
        ping('http://' + id + '/fee', 0.5).then(function (delta) {
          //id = info.ip + ':' + info.port;
          id = nodename + ':' + info.port;
          var trHTML = '';
          trHTML += '<tr class="id"><td><a href="http://' + nodename + ':' + info.port + '" target="_blank">' + nodename + ':' + info.port + '</a></td>';
          trHTML += '<td class="country">' + info.geo.country + ' <img src="' + img + '" align="absmiddle" border="0"></td>';
          trHTML += '<td class="text-right">' + info.fee + '</td>';
          trHTML += '<td class="text-right">' + info.uptime + '</td>';
          trHTML += '<td class="text-center">' + info.effi + '</td>';
          trHTML += '<td class="text-right" data-sort-value="' + info.hashrate + '">' + niceNumber(info.hashrate) + '</td>';
          trHTML += '<td class="text-right">' + info.users + '</td>';
          trHTML += '<td class="text-right">' + info.shares + '</td>';
          if (delta > 1000) {
            trHTML += '<td class="text-right"><span class="label label-danger">' + String(delta.toFixed(2)) + ' ms</span></td>';
          } else if (delta > 250) {
            trHTML += '<td class="text-right"><span class="label label-warning">' + String(delta.toFixed(2)) + ' ms</span></td>';
          } else {
            trHTML += '<td class="text-right"><span class="label label-success">' + String(delta.toFixed(2)) + ' ms</span></td>';
          }
          if (info.gwtl > 1000 || info.gwtl === undefined || info.gwtl === '0.00') {
            trHTML += '<td><span class="label label-danger">' + (info.gwtl || 'N/A') + ' ms</span></td>';
          } else if (info.gwtl > 250) {
            trHTML += '<td><span class="label label-warning">' + info.gwtl + ' ms</span></td>';
          } else {
            trHTML += '<td><span class="label label-success">' + info.gwtl + ' ms</span></td>';
          }
          trHTML += '<td class="text-center">' + info.protocol_version + '</td>';
          trHTML += '<td class="version">' + info.version + '</td>';
          $('#sortTable > tbody').append(trHTML);
        }).catch(function (err) {
          console.error(err);
        });
      });
    }
  });
};

$(document).ready(function () {
  var table = $('#sortTable').stupidtable();
  var thToSort = table.find("thead th").eq(8);
  thToSort.stupidsort();
  var anchor = void 0;
  table.on('aftertablesort', function (event, data) {
    var dir = $.fn.stupidtable.dir;

    var arrow = data.direction === dir.ASC ? 'up' : 'down';
    var th = $(this).find('th');
    th.find('.glyphicon').remove();
    th.eq(data.column).append(' <span class="glyphicon glyphicon-chevron-' + arrow + '"></span> ');
  });
  //$('a[data-toggle="tab"]').on('shown.bs.tab', function (evt) {
  //  anchor = $(evt.target).attr('href');
  //  anchor = anchor.substr(1, anchor.length);
  //  getlist(anchor);
  //});

  function lookupDNSNames() {
    for (dnsname of niceNames) {
      tmp = getIPfromName(dnsname);
      dnsPromises.push(tmp);
    }
    Promise.all(dnsPromises).then(arrayOfDNSLookups => {
      for (n of arrayOfDNSLookups) {
        if (n.Answer) {
          var nameIP = {
            name: n.Answer[0].name,
            ip: n.Answer[0].data
          }
        }
        namedIPs.push(nameIP);
      }
    getlist('vtc');//now that the DNS Lookup array is done... go ahead and load the page.
    });
  }
// Gotta love async work by a total idiot - enjoy!
lookupDNSNames();

});
