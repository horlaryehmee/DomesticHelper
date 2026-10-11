// Multi-page green sweep. Paste as a single-line browser_console expression.
// Visits each route, waits for content, runs the oklch-aware green detector,
// and returns a per-page summary. Bridges SPA navigation via history.pushState
// + a popstate nudge so React Router picks it up without a full reload.
(async function(){
  function toRGB(s){
    if(!s) return null; s=s.trim(); var m;
    if(m=s.match(/^rgba?\(([^)]+)\)/)){
      var p=m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
      return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
    }
    if(m=s.match(/^oklch\(([^)]+)\)/)){
      var q=m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
      var L=q[0],C=q[1],H=q[2],al=q.length>3?q[3]:1;
      var hr=H*Math.PI/180,a=C*Math.cos(hr),bb=C*Math.sin(hr);
      var l_=L+0.3963377774*a+0.2158037573*bb,m_=L-0.1055613458*a-0.0638541728*bb,s_=L-0.0894841775*a-1.2914855480*bb;
      var l=l_**3,mm=m_**3,ss=s_**3;
      var R=4.0767416621*l-3.3077115913*mm+0.2309699292*ss,G=-1.2684380046*l+2.6097574011*mm-0.3413193965*ss,B=-0.0041960863*l-0.7034186147*mm+1.7076147010*ss;
      function e(c){c=Math.max(0,Math.min(1,c));c=c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;return Math.round(c*255);}
      return {r:e(R),g:e(G),b:e(B),a:al};
    }
    return null;
  }
  function isG(c){
    if(!c||c.a<0.05) return false;
    var mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);
    return (c.g>c.r+12)&&(c.g>c.b+12)&&(mx-mn)>25;
  }
  function scan(){
    var hits=[], all=document.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el=all[i], cs=getComputedStyle(el);
      ['color','backgroundColor','borderTopColor','borderLeftColor','borderRightColor','outlineColor','fill','stroke'].forEach(function(pr){
        var raw=cs[pr], c=toRGB(raw);
        if(isG(c)){
          hits.push({pr:pr,raw:raw,tag:el.tagName.toLowerCase(),
            cls:(el.className&&el.className.toString?el.className.toString():'').slice(0,45),
            text:(el.textContent||'').trim().slice(0,24)});
        }
      });
    }
    var seen={},out=[];
    hits.forEach(function(h){var k=h.tag+h.raw+h.pr;if(!seen[k]){seen[k]=1;out.push(h);}});
    return out;
  }
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function go(path){
    return new Promise(function(res){
      history.pushState({},'',path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      res();
    });
  }
  var routes=['/','/search','/jobs','/community','/login','/register',
    '/admin','/admin/users','/admin/verifications','/admin/reports','/admin/reviews',
    '/admin/disputes','/admin/jobs','/admin/payments','/admin/trust-scores',
    '/admin/audit-logs','/admin/settings'];
  var out=[];
  for(var i=0;i<routes.length;i++){
    await go(routes[i]);
    await sleep(1500);
    var h=scan();
    out.push({route:routes[i], green:h.length, sample:h.slice(0,4)});
  }
  return JSON.stringify({pages:out, total:out.reduce(function(a,b){return a+b.green;},0)});
})()
