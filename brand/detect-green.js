// Reusable green-detector for the Hire Safe theme.
// Paste into browser_console as a single-line expression.
// Handles oklch()/color(srgb)/rgb() computed values (getComputedStyle in
// Chromium returns oklch verbatim, which a naive rgb-only regex misses —
// that bug is why an earlier sweep falsely reported "no green anywhere").
JSON.stringify((function(){
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
      var l_=L+0.3963377774*a+0.2158037573*bb, m_=L-0.1055613458*a-0.0638541728*bb, s_=L-0.0894841775*a-1.2914855480*bb;
      var l=l_**3,mm=m_**3,ss=s_**3;
      var R=4.0767416621*l-3.3077115913*mm+0.2309699292*ss;
      var G=-1.2684380046*l+2.6097574011*mm-0.3413193965*ss;
      var B=-0.0041960863*l-0.7034186147*mm+1.7076147010*ss;
      function e(c){c=Math.max(0,Math.min(1,c)); c=c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055; return Math.round(c*255);}
      return {r:e(R),g:e(G),b:e(B),a:al};
    }
    if(m=s.match(/^color\(srgb\s+([^)]+)\)/)){
      var w=m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
      return {r:Math.round(w[0]*255),g:Math.round(w[1]*255),b:Math.round(w[2]*255),a:1};
    }
    return null;
  }
  function isGreen(c){
    if(!c||c.a<0.05) return false;
    var mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);
    // green channel dominant, with real saturation (excludes warm ambers/corals
    // where r dominates, and near-greys)
    return (c.g > c.r + 12) && (c.g > c.b + 12) && (mx-mn) > 25;
  }
  var hits=[], all=document.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
    var el=all[i], cs=getComputedStyle(el);
    ['color','backgroundColor','borderTopColor','borderLeftColor','borderRightColor','outlineColor','fill','stroke','textDecorationColor'].forEach(function(pr){
      var raw=cs[pr], c=toRGB(raw);
      if(isGreen(c)){
        hits.push({pr:pr, raw:raw, rgb:'rgb('+c.r+','+c.g+','+c.b+')', tag:el.tagName.toLowerCase(),
          cls:(el.className&&el.className.toString?el.className.toString():'').slice(0,60),
          text:(el.textContent||'').trim().slice(0,30)});
      }
    });
  }
  var seen={}, out=[];
  hits.forEach(function(h){var k=h.tag+h.cls+h.rgb+h.pr; if(!seen[k]){seen[k]=1; out.push(h);}});
  return {url:location.pathname, greenCount:out.length, hits:out.slice(0,30)};
})())
