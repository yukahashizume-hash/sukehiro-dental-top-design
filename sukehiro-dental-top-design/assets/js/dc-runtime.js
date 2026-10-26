/* 軽量ランタイム：.dc.html テンプレートをブラウザで描画 */
// minimal dc runtime for preview
window.DCLogic = class { constructor(props){ this.props=props; this.state={}; } setState(s){ Object.assign(this.state, typeof s==='function'?s(this.state):s); window.__rerender && window.__rerender(); } };
window.dcBoot = function(src, width){
  const doc = new DOMParser().parseFromString(src,'text/html');
  const xdc = doc.querySelector('x-dc');
  const helmet = xdc.querySelector('helmet');
  helmet.querySelectorAll('link,style').forEach(n=>document.head.appendChild(n.cloneNode(true)));
  helmet.remove();
  const script = doc.querySelector('script[data-dc-script]');
  const propsDef = JSON.parse(script.getAttribute('data-props')||'{}');
  const props = {}; for (const k in propsDef) props[k]=propsDef[k].default;
  if (window.__props) Object.assign(props, window.__props);
  const code = script.textContent; script.remove();
  const Component = new Function('DCLogic', code + '\n;return Component;')(window.DCLogic);
  const tpl = document.createElement('template'); tpl.innerHTML = xdc.innerHTML;
  const comp = new Component(props);
  const root = document.createElement('div'); document.body.appendChild(root);
  const get = (scope, path) => { const ps = path.trim().split('.'); let v; for (const s of scope){ if (s && ps[0] in s){ v=s[ps[0]]; break; } } if (ps[0]==='true') return true; if (ps[0]==='false') return false; for (let i=1;i<ps.length;i++) v = v==null?v:v[ps[i]]; return v; };
  const interp = (str, scope) => str.replace(/\{\{([^}]+)\}\}/g,(m,p)=>{ const v=get(scope,p); return v==null?'':String(v); });
  function renderNodes(nodes, scope, out){
    for (const n of nodes){
      if (n.nodeType===3){ out.appendChild(document.createTextNode(interp(n.textContent,scope))); continue; }
      if (n.nodeType!==1) continue;
      const tag=n.tagName.toLowerCase();
      if (tag==='sc-for'){ const list=get(scope,n.getAttribute('list').replace(/[{}]/g,''))||[]; const as=n.getAttribute('as'); list.forEach((it,i)=>{ renderNodes(n.childNodes,[{[as]:it, [as+'Index']:i},...scope],out); }); continue; }
      if (tag==='sc-if'){ const v=get(scope,n.getAttribute('value').replace(/[{}]/g,'')); if (v) renderNodes(n.childNodes,scope,out); continue; }
      const el = n.namespaceURI && n.namespaceURI.includes('svg') ? document.createElementNS('http://www.w3.org/2000/svg', n.tagName) : document.createElement(tag==='template'?'div':n.tagName);
      for (const a of n.attributes){
        const m=a.value.match(/^\{\{([^}]+)\}\}$/);
        if (/^on/i.test(a.name) && m){ const fn=get(scope,m[1]); if (typeof fn==='function') el.addEventListener(a.name.slice(2).toLowerCase(), fn); continue; }
        if (a.name.startsWith('hint-')) continue;
        try{ el.setAttribute(a.name, interp(a.value,scope)); }catch(e){}
      }
      const kids = tag==='template'? n.content.childNodes : n.childNodes;
      renderNodes(kids, scope, el); out.appendChild(el);
    }
  }
  window.__rerender = () => { const vals = comp.renderVals(); root.innerHTML=''; renderNodes(tpl.content.childNodes,[vals],root); };
  window.__comp = comp;
  window.__rerender();
  if (comp.componentDidMount) comp.componentDidMount();
};
