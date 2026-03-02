(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=a(s);fetch(s.href,n)}})();const le="/api";async function B(e,t,a=null){const i={method:e,headers:{"Content-Type":"application/json"}};a&&(i.body=JSON.stringify(a));const s=await fetch(`${le}/${t}`,i);if(!s.ok){const n=await s.json().catch(()=>({detail:s.statusText}));throw new Error(n.detail||s.statusText)}return s.json()}const b={get:e=>B("GET",e),post:(e,t)=>B("POST",e,t),health:()=>fetch("/health").then(e=>e.json()).catch(()=>null),centroids:()=>B("GET","data/centroids"),envelopes:()=>B("GET","data/envelopes"),pareto:()=>B("GET","data/pareto"),masterStats:()=>B("GET","data/master-stats"),trajectory:e=>B("GET",`data/trajectory/${e}`),clusterBatchMap:()=>B("GET","data/cluster-batch-map"),constraints:()=>B("GET","data/constraints"),driftCheck:e=>B("POST","batch/drift-check",e),recommendations:(e,t)=>B("GET",`recommendations/${e}/${t}`),logDecision:e=>B("POST","decisions/",e),decisionHistory:(e=50)=>B("GET",`decisions/history?limit=${e}`),signature:e=>B("GET",`signatures/${e}`),signatureHistory:e=>B("GET",`signatures/${e}/history`),carbonTargets:()=>B("GET","carbon/targets"),preferenceSummary:()=>B("GET","preferences/summary")},de=[{path:"/",label:"Home"},{path:"/dashboard",label:"Dashboard"},{path:"/live-batch",label:"Live Batch"},{path:"/recommendations",label:"Recommendations"},{path:"/signatures",label:"Golden Signatures"},{path:"/carbon",label:"Carbon Targets"},{path:"/simulation",label:"⚡ Simulation"}];function me(){const e=document.getElementById("navbar"),t=de.map(a=>`<a href="#${a.path}">${a.label}</a>`).join("");e.innerHTML=`
    <div class="nav-brand">CB-MOPA</div>
    <div class="nav-links">${t}</div>
    <div class="nav-status" id="nav-health">
      <span class="status-dot" id="health-dot"></span>
      <span id="health-text">Checking...</span>
    </div>
  `,J(),setInterval(J,15e3)}async function J(){const e=document.getElementById("health-dot"),t=document.getElementById("health-text");if(!(!e||!t))try{const a=await b.health();a&&a.status==="ok"?(e.className="status-dot ok",t.textContent="API Connected"):(e.className="status-dot fail",t.textContent="API Error")}catch{e.className="status-dot fail",t.textContent="API Offline"}}const z={};let H=null;function A(e,t){z[e]=t}function he(){return window.location.hash.slice(1)||"/"}async function X(){const e=he(),t=z[e]||z["/"];if(!t)return;H&&typeof H=="function"&&(H(),H=null),document.querySelectorAll(".nav-links a").forEach(i=>{i.classList.toggle("active",i.getAttribute("href")===`#${e}`)});const a=document.getElementById("main-content");a.innerHTML='<div class="spinner"></div>';try{H=await t(a)}catch(i){a.innerHTML=`<div class="alert alert-crit">Page error: ${i.message}</div>`,console.error(i)}}function ue(){window.addEventListener("hashchange",X),X()}const te=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"],h={cluster:te[2],batchId:"T001",emissionFactor:.72};function pe(){document.getElementById("sidebar").classList.remove("hidden")}function q(){document.getElementById("sidebar").classList.add("hidden")}function ge(){let e=document.getElementById("loading-overlay");e||(e=document.createElement("div"),e.id="loading-overlay",e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
        <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
        <div style="color:var(--text-secondary);font-weight:600">Updating analytics...</div>
      </div>
    `,e.style.cssText=`
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
      background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
    `,document.body.appendChild(e))}function ve(){const e=document.getElementById("loading-overlay");e&&e.remove()}function N(e={}){pe();const t=document.getElementById("sidebar"),a=e.showEmissionFactor!==!1;if(t.innerHTML=`
    <h3>Controls</h3>

    <label for="sb-cluster">Golden Cluster</label>
    <select id="sb-cluster">
      ${te.map(i=>`<option value="${i}" ${i===h.cluster?"selected":""}>${i}</option>`).join("")}
    </select>

    <label for="sb-batch">Batch ID</label>
    <input type="text" id="sb-batch" value="${h.batchId}" />

    ${a?`
      <label for="sb-ef">Emission Factor (kg CO₂/kWh)</label>
      <input type="range" class="sidebar-range" id="sb-ef"
             min="0.3" max="1.2" step="0.01" value="${h.emissionFactor}" />
      <div class="sidebar-range-value" id="sb-ef-val">${h.emissionFactor.toFixed(2)}</div>
    `:""}

    <button class="btn btn-primary btn-full" id="sb-apply" style="margin-top:1.2rem">Apply Changes</button>
  `,t.querySelector("#sb-cluster").addEventListener("change",i=>{h.cluster=i.target.value}),t.querySelector("#sb-batch").addEventListener("input",i=>{h.batchId=i.target.value.trim()||"T001"}),a){const i=t.querySelector("#sb-ef"),s=t.querySelector("#sb-ef-val");i.addEventListener("input",n=>{h.emissionFactor=parseFloat(n.target.value),s.textContent=h.emissionFactor.toFixed(2)})}t.querySelector("#sb-apply").addEventListener("click",async()=>{if(e.onChange){ge(),await new Promise(i=>setTimeout(i,50));try{await e.onChange()}finally{ve()}}})}function be(e){q(),e.innerHTML=`
    <div class="landing-hero">
      <p style="color:var(--accent-blue);font-weight:600;font-size:0.85rem;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:1rem">PHARMACEUTICAL PROCESS ANALYTICS</p>

      <h1>The smartest way<br/>to optimize your<br/>manufacturing.</h1>

      <p class="subtitle">
        CB-MOPA uses causal inference, golden batch signatures, and adaptive
        operator preference learning to optimize pharmaceutical tablet
        manufacturing in real-time.
      </p>

      <div style="display:flex;gap:1rem;margin-bottom:3rem">
        <a href="#/dashboard" class="btn btn-primary landing-cta">Enter Dashboard</a>
        <a href="#/signatures" class="btn btn-outline landing-cta-secondary">Explore Signatures</a>
      </div>

      <div class="landing-features">
        <div class="card">
          <h3>Probabilistic DTW Envelope</h3>
          <p>Real-time temporal drift detection against golden batch signatures.
          DBA builds ±3σ probabilistic corridors for each phase × sensor
          combination.</p>
        </div>
        <div class="card">
          <h3>Causal Counterfactual Engine</h3>
          <p>DoWhy Do-calculus interventions that prove causal safety before
          acting. Structural Causal Models estimate treatment effects and generate
          dual-pathway recommendations.</p>
        </div>
        <div class="card">
          <h3>Bayesian HITL Preference</h3>
          <p>BoTorch PairwiseGP learns the operator's latent utility function
          from pairwise A/B choices. Recommendations adapt to each supervisor's
          style over time.</p>
        </div>
      </div>

      <div class="landing-steps">
        <h2>How CB-MOPA works</h2>
        <p class="steps-subtitle">Just 3 steps to optimize your manufacturing process.</p>
        <div class="steps-grid">
          <div class="step-item">
            <div class="step-number">1</div>
            <h4>Detect Drift</h4>
            <p>Compare live batch sensor traces against golden DTW envelopes to detect deviations before they cause quality issues.</p>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <h4>Get Recommendations</h4>
            <p>Receive dual-pathway causal recommendations — Yield Guard or Carbon Savior — backed by Do-calculus safety proofs.</p>
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <h4>Learn & Adapt</h4>
            <p>The Bayesian preference model learns from your decisions, continuously improving recommendations for your team.</p>
          </div>
        </div>
      </div>

      <div class="cta-section">
        <h2>Start optimizing today</h2>
        <p>Access live dashboards, causal recommendations, and sustainability tracking.</p>
        <a href="#/dashboard" class="btn btn-primary landing-cta">Go to Dashboard</a>
      </div>

      <div class="footer" style="width:100%;max-width:900px">
        <div>
          <div class="footer-brand">CB-MOPA</div>
          <div class="footer-copy">2026 © CB-MOPA — IIT Hyderabad × AVEVA</div>
        </div>
        <div class="footer-links">
          <div class="footer-links-col">
            <a href="#/">Home</a>
            <a href="#/dashboard">Dashboard</a>
            <a href="#/live-batch">Live Batch</a>
          </div>
          <div class="footer-links-col">
            <a href="#/recommendations">Recommendations</a>
            <a href="#/signatures">Golden Signatures</a>
            <a href="#/carbon">Carbon Targets</a>
          </div>
        </div>
      </div>
    </div>
  `}async function ye(e){q(),e.innerHTML=`
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Track B Optimization Engine — Pharmaceutical Tablet Manufacturing</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="card">
        <h3>Module 1: Probabilistic DTW Envelope</h3>
        <p>Real-time temporal drift detection against golden batch signatures.
        DBA builds ±3σ probabilistic corridors for each phase × sensor. Soft-DTW
        distance quantifies deviation severity.</p>
      </div>
      <div class="card">
        <h3>Module 2: Causal Counterfactual Engine</h3>
        <p>DoWhy Do-calculus interventions prove causal safety before acting.
        Structural Causal Models estimate treatment effects and generate dual-pathway
        recommendations.</p>
      </div>
      <div class="card">
        <h3>Module 3: Bayesian HITL Preference</h3>
        <p>BoTorch PairwiseGP learns operator latent utility from pairwise A/B choices.
        Recommendations re-ranked by learned preference, adapting to each supervisor.</p>
      </div>
    </div>

    <h2 class="section-title">System Status</h2>
    <div class="grid-4" id="status-cards">
      <div class="metric-card"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><p class="metric-label">API Backend</p></div>
      <div class="metric-card"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><p class="metric-label">Database</p></div>
      <div class="metric-card"><div class="metric-value">60</div><p class="metric-label">Batches Loaded</p></div>
      <div class="metric-card"><div class="metric-value">3</div><p class="metric-label">Golden Clusters</p></div>
    </div>

    <hr class="divider" />

    <div class="alert alert-info">Use the navigation bar to access Live Batch Envelope, Causal Recommendations, Golden Signatures, and Carbon Targets.</div>
  `;try{const t=await b.health(),a=document.getElementById("status-cards");if(!a)return;const i=t&&t.status==="ok",s=t&&t.db_connected;a.children[0].innerHTML=`<div class="metric-value" style="color:${i?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">API Backend</p>`,a.children[1].innerHTML=`<div class="metric-value" style="color:${s?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">Database</p>`}catch{}}const Q={paper_bgcolor:"#FFFFFF",plot_bgcolor:"#FAFAFA",font:{family:"Inter, sans-serif",color:"#1A1A2E",size:12},margin:{l:60,r:20,t:40,b:50},xaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"},yaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"}},fe={displayModeBar:!1,responsive:!0},p={blue:"#4F46E5",green:"#16A34A",orange:"#EA580C",red:"#DC2626",amber:"#D97706",muted:"#9CA3AF"},ae={"Max Quality Golden":p.green,"Deep Decarbonization Golden":p.blue,"Balanced Operational Golden":p.orange};function k(e,t,a={},i={}){const s=document.getElementById(e);if(!s)return;const n={...Q,...a},o={...fe,...i};Plotly.newPlot(s,t,n,o)}let W=null,R=null,U=null,L=null;async function ie(e){N({showEmissionFactor:!0,onChange:()=>ie(e)}),e.innerHTML=`
    <div class="page-header">
      <h1>Live Batch vs Golden Envelope</h1>
      <p id="batch-caption">Loading...</p>
    </div>

    <h2 class="section-title">Process Parameter Controls</h2>
    <div class="form-grid" id="cpp-sliders"></div>
    <button class="btn btn-primary btn-full" id="btn-drift">Check Drift</button>

    <div id="drift-result" style="margin-top:1rem"></div>

    <hr class="divider" />

    <h2 class="section-title">Golden Envelope Visualization</h2>
    <div class="grid-2" style="margin-bottom:1rem">
      <div class="form-group">
        <label for="env-phase">Phase</label>
        <select id="env-phase" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)"></select>
      </div>
      <div class="form-group">
        <label for="env-sensor">Sensor</label>
        <select id="env-sensor" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)"></select>
      </div>
    </div>
    <div id="envelope-chart" class="chart-container" style="height:420px"></div>

    <hr class="divider" />

    <h2 class="section-title">Parameter Deviation Radar</h2>
    <div class="grid-2">
      <div id="radar-chart" class="chart-container" style="height:400px"></div>
      <div id="cpp-table-container"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Phase Energy Breakdown</h2>
    <div id="energy-chart" class="chart-container" style="height:350px"></div>
    <div class="grid-3" id="co2-metrics"></div>
  `;try{[W,R,U,L]=await Promise.all([W||b.masterStats(),R||b.centroids(),U||b.envelopes(),L||b.constraints()])}catch(t){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${t.message}</div>`;return}xe(),Ce(),$e(),j(),_e(),Ie(),document.getElementById("btn-drift").addEventListener("click",Ee),document.getElementById("env-phase").addEventListener("change",()=>{se(),j()}),document.getElementById("env-sensor").addEventListener("change",j)}function xe(){const e=document.getElementById("batch-caption");e&&(e.textContent=`Cluster: ${h.cluster} | Batch: ${h.batchId} | EF: ${h.emissionFactor} kg CO₂/kWh`)}function Y(){const e={};return L.CPP_COLS.forEach(t=>{const a=document.getElementById(`cpp-${t}`);e[t]=a?parseFloat(a.value):0}),e}function Ce(){const e=document.getElementById("cpp-sliders"),t=R[h.cluster]||{},a=W.cpp_ranges;e.innerHTML=L.CPP_COLS.map(i=>{const s=a[i]||{min:0,max:100,mean:50},n=t[i]!==void 0?t[i]:s.mean,o=Math.max(s.min,Math.min(s.max,n)),r=((s.max-s.min)/100).toFixed(4);return`
      <div class="form-group">
        <label>${i.replace(/_/g," ")}</label>
        <input type="range" id="cpp-${i}" min="${s.min}" max="${s.max}" step="${r}" value="${o}" />
        <div class="range-value" id="rv-${i}">${o.toFixed(2)}</div>
      </div>
    `}).join(""),L.CPP_COLS.forEach(i=>{const s=document.getElementById(`cpp-${i}`),n=document.getElementById(`rv-${i}`);s.addEventListener("input",()=>{n.textContent=parseFloat(s.value).toFixed(2)})})}async function Ee(){const e=document.getElementById("btn-drift"),t=document.getElementById("drift-result");e.disabled=!0,e.textContent="Running drift detection...";try{const a=await b.driftCheck({batch_id:h.batchId,cpp_params:Y(),cluster_name:h.cluster}),i=a.overall_alarm||"UNKNOWN";let s="alert-info",n=i;i==="OK"?(s="alert-ok",n="OK — Batch within golden envelope"):i==="WARNING"?(s="alert-warn",n="WARNING — Partial drift detected"):(s="alert-crit",n="CRITICAL — Significant deviation");let o="";a.drift_details&&a.drift_details.length&&(o=`
        <table class="data-table" style="margin-top:1rem">
          <thead><tr><th>Phase</th><th>Sensor</th><th>Alarm</th><th>Drift Score</th><th>% Outside</th></tr></thead>
          <tbody>${a.drift_details.map(r=>`
            <tr>
              <td>${r.phase}</td>
              <td>${r.sensor}</td>
              <td><span class="badge badge-${r.alarm_level==="OK"?"pass":r.alarm_level==="WARNING"?"warn":"fail"}">${r.alarm_level}</span></td>
              <td>${r.drift_score.toFixed(4)}</td>
              <td>${r.percent_outside.toFixed(1)}%</td>
            </tr>
          `).join("")}</tbody>
        </table>
      `),t.innerHTML=`<div class="alert ${s}">OVERALL: ${n}</div>${o}`}catch(a){t.innerHTML=`<div class="alert alert-crit">Drift check failed: ${a.message}</div>`}finally{e.disabled=!1,e.textContent="Check Drift"}}function $e(){const e=document.getElementById("env-phase"),t=Object.keys(L.PHASE_SENSOR_MAP);e.innerHTML=t.map(a=>`<option value="${a}">${a}</option>`).join(""),se()}function se(){const e=document.getElementById("env-phase").value,t=document.getElementById("env-sensor"),a=L.PHASE_SENSOR_MAP[e]||[];t.innerHTML=a.map(i=>`<option value="${i}">${i}</option>`).join("")}function j(){const e=document.getElementById("env-phase")?.value,t=document.getElementById("env-sensor")?.value;if(!e||!t)return;const a=U?.[h.cluster]?.[e]?.[t];if(!a){document.getElementById("envelope-chart").innerHTML='<div class="alert alert-info">No envelope data for this selection</div>';return}const i=a.mean,s=a.upper,n=a.lower,o=Array.from({length:i.length},(E,_)=>_),r=Y(),l=R[h.cluster]||{};let d=0;L.CPP_COLS.forEach(E=>{const _=r[E]||0,f=l[E]||.01;d+=Math.abs(_-f)/Math.max(Math.abs(f),.01)*100}),d/=L.CPP_COLS.length;const c=Math.sqrt(i.reduce((E,_)=>E+Math.pow(_-i.reduce((f,w)=>f+w,0)/i.length,2),0)/i.length)||1,u=Math.max(.02,d/100)*c;let y=h.batchId.split("").reduce((E,_)=>E+_.charCodeAt(0),0);const v=()=>(y=(y*16807+0)%2147483647,(y/2147483647-.5)*2),C=i.map(E=>E+v()*u),F=[{x:[...o,...o.slice().reverse()],y:[...s,...n.slice().reverse()],fill:"toself",fillcolor:"rgba(46,134,193,0.15)",line:{color:"rgba(0,0,0,0)"},name:"±3σ Envelope",hoverinfo:"skip"},{x:o,y:i,mode:"lines",line:{color:p.blue,width:2,dash:"dot"},name:"Golden Mean (DBA)"},{x:o,y:s,mode:"lines",line:{color:p.blue,width:1,dash:"dash"},name:"Upper +3σ",opacity:.6},{x:o,y:n,mode:"lines",line:{color:p.blue,width:1,dash:"dash"},name:"Lower -3σ",opacity:.6},{x:o,y:C,mode:"lines",line:{color:p.orange,width:2.5},name:`Batch ${h.batchId}`}],S=[],P=[];C.forEach((E,_)=>{(E<n[_]||E>s[_])&&(S.push(_),P.push(E))}),S.length&&F.push({x:S,y:P,mode:"markers",marker:{color:p.red,size:8,symbol:"x"},name:"Outside Envelope"}),k("envelope-chart",F,{title:`Batch ${h.batchId} vs ${h.cluster} — ${e} / ${t}`,xaxis:{title:"Time Step"},yaxis:{title:t.replace(/_/g," ")},height:420,legend:{orientation:"h",y:-.18}})}function _e(){const e=Y(),t=R[h.cluster]||{},a=L.CPP_COLS.map(c=>c.replace(/_/g," ")),i=L.CPP_COLS.map(c=>e[c]||0),s=L.CPP_COLS.map(c=>t[c]||0),n=Math.max(...i,...s,1),o=i.map(c=>c/n),r=s.map(c=>c/n);k("radar-chart",[{type:"scatterpolar",r:[...r,r[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(79,70,229,0.25)",line:{color:p.blue,width:3},marker:{size:7,color:p.blue},name:"Golden Centroid"},{type:"scatterpolar",r:[...o,o[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(234,88,12,0.25)",line:{color:p.orange,width:3},marker:{size:7,color:p.orange},name:"Current Batch"}],{polar:{bgcolor:"#FAFAFA",radialaxis:{visible:!0,range:[0,1.1],gridcolor:"#E5E7EB"},angularaxis:{gridcolor:"#E5E7EB"}},height:400,showlegend:!0,legend:{orientation:"h",y:-.1}});const l=document.getElementById("cpp-table-container"),d=L.CPP_COLS.map(c=>{const u=(e[c]||0).toFixed(2),y=(t[c]||0).toFixed(2),v=t[c]?((e[c]-t[c])/t[c]*100).toFixed(1):"0.0";return`<tr><td>${c.replace(/_/g," ")}</td><td>${u}</td><td>${y}</td><td>${v}%</td></tr>`}).join("");l.innerHTML=`
    <h3 style="margin-bottom:0.5rem">CPP Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Current</th><th>Golden</th><th>Dev %</th></tr></thead>
      <tbody>${d}</tbody>
    </table>
  `}async function Ie(){try{const e=await b.trajectory(h.batchId);if(!e||!e.length){document.getElementById("energy-chart").innerHTML='<div class="alert alert-info">No trajectory data for this batch</div>';return}const t={};e.forEach(l=>{const d=l.Phase||"Unknown";t[d]=(t[d]||0)+(l.Energy_kWh||0)});const a=Object.keys(t).sort((l,d)=>t[l]-t[d]),i=a.map(l=>t[l]);k("energy-chart",[{y:a,x:i,type:"bar",orientation:"h",marker:{color:i,colorscale:"Viridis"},text:i.map(l=>`${l.toFixed(2)} kWh`),textposition:"outside",name:`Batch ${h.batchId}`}],{title:`Energy Consumption by Phase — Batch ${h.batchId}`,xaxis:{title:"Energy (kWh)"},yaxis:{title:"Phase"},height:350,margin:{l:120,r:60,t:50,b:40}});const s=e.reduce((l,d)=>l+(d.Energy_kWh||0),0),n=s*h.emissionFactor,r=50-n;document.getElementById("co2-metrics").innerHTML=`
      <div class="metric-card"><div class="metric-value">${s.toFixed(2)}</div><p class="metric-label">Total Energy (kWh)</p></div>
      <div class="metric-card"><div class="metric-value">${n.toFixed(2)}</div><p class="metric-label">CO₂e (kg)</p></div>
      <div class="metric-card"><div class="metric-value" style="color:${r>0?"var(--accent-green)":"var(--accent-red)"}">${r>0?"+":""}${r.toFixed(2)}</div><p class="metric-label">Target Headroom (kg)</p></div>
    `}catch{document.getElementById("energy-chart").innerHTML=`<div class="alert alert-info">No trajectory data for batch ${h.batchId}</div>`}}const Be={pathway_name:"Yield Guard",param_changes:[{param:"Drying_Temp",old_value:60,new_value:54,delta_pct:-10}],expected_cqa_delta:{Hardness:.08,Friability:-.1,Dissolution_Rate:.03,Disintegration_Time:-1.08,Content_Uniformity:.02,total_CO2e_kg:-.14},expected_co2_change:-.14,safety_check:"PASS",causal_confidence:.82,preference_utility:.42},we={pathway_name:"Carbon Savior",param_changes:[{param:"Machine_Speed",old_value:150,new_value:135,delta_pct:-10}],expected_cqa_delta:{Hardness:.02,Friability:-.03,Dissolution_Rate:.01,Disintegration_Time:-.5,Content_Uniformity:-.08,total_CO2e_kg:-.25},expected_co2_change:-.25,safety_check:"PASS",causal_confidence:.78,preference_utility:-.69};async function ne(e){N({showEmissionFactor:!1,onChange:()=>ne(e)});let t={},a={};try{const d=await b.masterStats();t=d.batch_data?.[h.batchId]||d.batch_data?.[d.batch_ids[0]]||{},a=await b.constraints()}catch{}const i=a.CQA_COLS||["Hardness","Friability","Dissolution_Rate","Disintegration_Time","Content_Uniformity","Tablet_Weight"],s=a.PHARMA_LIMITS||{},n=i.map(d=>{const c=t[d]??0,u=s[d]||{};let y=!0,v="";return u.min!==void 0&&u.max!==void 0?(y=c>=u.min&&c<=u.max,v=`[${u.min}, ${u.max}]`):u.min!==void 0?(y=c>=u.min,v=`≥ ${u.min}`):u.max!==void 0&&(y=c<=u.max,v=`≤ ${u.max}`),`<div class="metric-card">
      <div class="metric-value" style="font-size:1.4rem;color:${y?"var(--accent-green)":"var(--accent-red)"}">${c.toFixed(2)}</div>
      <p class="metric-label">${d.replace(/_/g," ")}</p>
      <div class="metric-delta neutral">Target: ${v}</div>
    </div>`}).join("");let o=null,r=null,l=!1;try{const d=await b.recommendations(h.batchId,h.cluster);o=d.pathway_a,r=d.pathway_b}catch{}o||(l=!0,o=Be,r=we),e.innerHTML=`
    <div class="page-header">
      <h1>Causal Recommendation Engine</h1>
      <p>Do-calculus structural causal models estimate the causal effect of each process parameter change.
      The BoTorch PairwiseGP re-ranks recommendations by your historical preferences.</p>
    </div>

    <h2 class="section-title">Current Batch: ${h.batchId}</h2>
    <div class="grid-3" style="margin-bottom:1.5rem">${n}</div>

    <hr class="divider" />

    <h2 class="section-title">Dual-Pathway Recommendations</h2>
    ${l?'<div class="alert alert-warn">API unavailable — showing demo recommendations</div>':""}
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div class="pathway-card pathway-a" id="card-a"></div>
      <div class="pathway-card pathway-b" id="card-b"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Operator Decision</h2>
    <div class="grid-3" style="margin-bottom:1rem">
      <button class="btn btn-success btn-full" id="btn-exec-a">Execute Pathway A (${o.pathway_name})</button>
      <button class="btn btn-primary btn-full" id="btn-exec-b">Execute Pathway B (${r?.pathway_name||"B"})</button>
      <button class="btn btn-outline btn-full" id="btn-modify">Modify & Execute</button>
    </div>
    <div id="decision-result"></div>
    <div id="modify-form" style="display:none"></div>

    <hr class="divider" />

    <h2 class="section-title">Operator Preference History</h2>
    <div class="grid-2">
      <div id="pref-chart" class="chart-container" style="height:300px"></div>
      <div id="pref-stats"></div>
    </div>
    <div id="decision-history"></div>
  `,Z("card-a",o,"impact-a"),r&&Z("card-b",r,"impact-b"),document.getElementById("btn-exec-a").addEventListener("click",()=>V(o,r,"A")),document.getElementById("btn-exec-b").addEventListener("click",()=>V(o,r,"B")),document.getElementById("btn-modify").addEventListener("click",()=>ke(o,r,a.CPP_COLS||[])),Se()}function Z(e,t,a){const i=document.getElementById(e),s=t.param_changes||[],n=t.expected_cqa_delta||{},o=t.safety_check||"UNKNOWN",r=t.causal_confidence||.8,l=t.preference_utility??0,d=s.map(v=>`<tr><td>${v.param}</td><td>${v.old_value}</td><td>${v.new_value}</td><td>${v.delta_pct>0?"+":""}${v.delta_pct.toFixed(1)}%</td></tr>`).join("");i.innerHTML=`
    <h3>${t.pathway_name}</h3>
    <div class="subtitle">GP Utility Score: ${l.toFixed(3)}</div>
    ${s.length?`<table class="data-table" style="margin-bottom:1rem">
      <thead><tr><th>Param</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
      <tbody>${d}</tbody>
    </table>`:""}
    <div id="${a}" style="height:200px;margin-bottom:1rem"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${t.expected_co2_change>0?"+":""}${t.expected_co2_change.toFixed(4)} kg</div><p class="metric-label">CO₂e Change</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${(r*100).toFixed(0)}%</div><p class="metric-label">Confidence</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem;color:${o==="PASS"?"var(--accent-green)":"var(--accent-red)"}">${o}</div><p class="metric-label">Safety</p></div>
    </div>
  `;const c=Object.keys(n),u=Object.values(n),y=u.map(v=>v>0?p.green:v<0?p.red:p.muted);k(a,[{x:u,y:c.map(v=>v.replace(/_/g," ")),type:"bar",orientation:"h",marker:{color:y},text:u.map(v=>`${v>0?"+":""}${v.toFixed(4)}`),textposition:"outside"}],{title:"Expected CQA Impact",height:200,margin:{l:120,r:60,t:35,b:20},xaxis:{title:"Delta"},font:{size:11}})}async function V(e,t,a,i=null,s=""){const n=document.getElementById("decision-result");try{const o=await b.logDecision({batch_id:h.batchId,pathway_a:e,pathway_b:t,chosen:a,modified_params:i,reason:s,target_config:h.cluster});if(o){const r=o.total_comparisons||0;n.innerHTML=`<div class="alert alert-ok">Decision logged. ${o.preference_model_updated?"Preference model updated.":"Recorded."} (${r}/3 comparisons)</div>`}}catch(o){n.innerHTML=`<div class="alert alert-crit">Failed: ${o.message}</div>`}}function ke(e,t,a){const i=document.getElementById("modify-form");i.style.display="block",i.innerHTML=`
    <h3 style="margin-bottom:1rem">Custom Parameter Adjustments</h3>
    <div class="form-grid">${a.map(s=>`<div class="form-group">
        <label>${s.replace(/_/g," ")} Δ%</label>
        <input type="number" id="mod-${s}" value="0" min="-20" max="20" step="1"
               style="width:100%;padding:6px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
      </div>`).join("")}</div>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Reason</label>
      <input type="text" id="mod-reason" placeholder="Reason for modification"
             style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
    </div>
    <button class="btn btn-primary" id="btn-submit-mod">Submit Modified Decision</button>
  `,document.getElementById("btn-submit-mod").addEventListener("click",()=>{const s={};a.forEach(o=>{const r=parseFloat(document.getElementById(`mod-${o}`).value)||0;r!==0&&(s[o]=r)});const n=document.getElementById("mod-reason").value;V(e,t,"MODIFIED",s,n),i.style.display="none"})}async function Se(){try{const e=await b.preferenceSummary();if(!e)return;const t=e.quality_preferred_count||0,a=e.carbon_preferred_count||0;k("pref-chart",[{x:[`Yield Guard
(Quality)`],y:[t],type:"bar",marker:{color:p.green},text:[String(t)],textposition:"outside",name:"Quality"},{x:[`Carbon Savior
(Decarb)`],y:[a],type:"bar",marker:{color:p.blue},text:[String(a)],textposition:"outside",name:"Carbon"}],{title:"Pathway Preference Distribution",yaxis:{title:"Times Chosen"},height:300,showlegend:!1});const i=e.status==="active"?'<span class="badge badge-pass">PairwiseGP Active</span>':'<span class="badge badge-warn">Cold Start</span>';document.getElementById("pref-stats").innerHTML=`
      <h3 style="margin-bottom:1rem">Model Status</h3>
      <div style="margin-bottom:1rem">${i}</div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.total_decisions}</div><p class="metric-label">Total Decisions</p></div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.comparisons_count}</div><p class="metric-label">Comparisons</p></div>
      <div class="metric-card"><div class="metric-value">${(e.quality_preference_pct||0).toFixed(0)}%</div><p class="metric-label">Quality Preference</p></div>
    `}catch{}try{const e=await b.decisionHistory(10);if(e&&e.length){const t=e.map(a=>`<tr><td>${a.batch_id||""}</td><td>${a.chosen_pathway||""}</td><td>${a.target_config||""}</td><td>${(a.timestamp||"").slice(0,19)}</td></tr>`).join("");document.getElementById("decision-history").innerHTML=`
        <h3 style="margin:1rem 0 0.5rem">Recent Decision Log</h3>
        <table class="data-table"><thead><tr><th>Batch</th><th>Chosen</th><th>Config</th><th>Time</th></tr></thead><tbody>${t}</tbody></table>
      `}}catch{}}const G=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"];async function re(e){N({showEmissionFactor:!1,onChange:()=>re(e)}),e.innerHTML=`
    <div class="page-header">
      <h1>Golden Signature Explorer</h1>
      <p>Pareto-optimal trade-off space — 3 golden clusters — Continuous learning</p>
    </div>

    <h2 class="section-title">Multi-Objective Pareto Front — Trade-off Space</h2>
    <div id="pareto-chart" class="chart-container" style="height:550px"></div>

    <hr class="divider" />

    <h2 class="section-title">Golden Cluster Profiles</h2>
    <div class="grid-3" id="cluster-cards"></div>

    <hr class="divider" />

    <h2 class="section-title">Signature Version History</h2>
    <div class="form-group" style="max-width:360px;margin-bottom:1rem">
      <label for="hist-cluster">Cluster</label>
      <select id="hist-cluster" style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)">
        ${G.map(s=>`<option value="${s}">${s}</option>`).join("")}
      </select>
    </div>
    <div id="version-timeline"></div>

    <hr class="divider" />

    <h2 class="section-title">Simulate New Batch — Dominance Check</h2>
    <div id="sim-panel" style="display:none">
      <div class="form-grid" id="sim-sliders"></div>
      <button class="btn btn-primary" id="btn-sim">Check Dominance</button>
      <div id="sim-result" style="margin-top:1rem"></div>
    </div>
    <button class="btn btn-outline" id="btn-show-sim">Open Simulation Panel</button>

    <hr class="divider" />

    <h2 class="section-title">Export Golden Signatures</h2>
    <button class="btn btn-outline" id="btn-export">Download Golden Signatures (JSON)</button>
  `;const[t,a,i]=await Promise.all([b.pareto().catch(()=>[]),b.centroids().catch(()=>({})),b.constraints().catch(()=>({}))]);t.length?Te(t):document.getElementById("pareto-chart").innerHTML='<div class="alert alert-info">No Pareto front data found.</div>',Le(a),ee(G[0]),document.getElementById("hist-cluster").addEventListener("change",s=>ee(s.target.value)),document.getElementById("btn-show-sim").addEventListener("click",()=>{document.getElementById("sim-panel").style.display="block",document.getElementById("btn-show-sim").style.display="none",Oe(a,i)}),document.getElementById("btn-export").addEventListener("click",()=>Fe(a))}function Te(e){const t=[];for(const[a,i]of Object.entries(ae)){const s=e.filter(n=>n.cluster_name===a);s.length&&t.push({type:"scatter3d",mode:"markers",x:s.map(n=>n.Dissolution_Rate||0),y:s.map(n=>n.Hardness||0),z:s.map(n=>n.total_CO2e_kg||n.total_energy_kWh||0),marker:{size:5,color:i,opacity:.8},name:a,hovertext:s.map(n=>`Cluster: ${a}<br>Hardness: ${(n.Hardness||0).toFixed(2)}<br>Dissolution: ${(n.Dissolution_Rate||0).toFixed(2)}<br>Friability: ${(n.Friability||0).toFixed(3)}<br>CO₂e: ${(n.total_CO2e_kg||0).toFixed(2)}`),hoverinfo:"text"})}k("pareto-chart",t,{scene:{xaxis:{title:"Dissolution Rate"},yaxis:{title:"Hardness"},zaxis:{title:"CO₂e (kg)"},bgcolor:"#FAFAFA"},height:550,margin:{l:0,r:0,t:30,b:0},legend:{orientation:"h",y:-.05,font:{size:12}}})}async function Le(e){const t=document.getElementById("cluster-cards"),a=[];for(const i of G){const s=ae[i]||p.blue,n=e[i]||{};let o="";try{const l=await b.signature(i);o=`<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">v${l.version} — ${l.source} — Active since ${(l.created_at||"").slice(0,19)}</div>`}catch{o='<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">Signature info unavailable</div>'}const r=Object.entries(n).map(([l,d])=>`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td></tr>`).join("");a.push(`
      <div class="card">
        <h3><span class="dot" style="background:${s}"></span>${i}</h3>
        ${o}
        <table class="data-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${r}</tbody></table>
      </div>
    `)}t.innerHTML=a.join("")}async function ee(e){const t=document.getElementById("version-timeline");try{const a=await b.signatureHistory(e);if(!a||!a.length){t.innerHTML='<div class="alert alert-info">No history available.</div>';return}t.innerHTML=a.map(i=>{const s=i.version||"?",n=i.source||"unknown",o=(i.created_at||"").slice(0,19),r=i.trigger_batch_id,l=i.is_active?'<span class="badge badge-pass" style="margin-left:8px">ACTIVE</span>':"";return`
        <div class="timeline-entry">
          <span class="version-badge">v${s}</span>
          <strong style="margin-left:8px">${n.toUpperCase()}</strong>${l}<br/>
          <span style="color:var(--text-muted)">${o}</span>
          ${r?`<br/><span style="color:var(--accent-green)">Triggered by batch: <strong>${r}</strong></span>`:""}
        </div>
      `}).join("")}catch(a){t.innerHTML=`<div class="alert alert-warn">Could not load history: ${a.message}</div>`}}async function Oe(e,t){const a=document.getElementById("sim-sliders"),i=t.CPP_COLS||[];let s,n;try{[s,n]=await Promise.all([b.masterStats(),b.pareto()])}catch{return}const o=e[h.cluster]||{};a.innerHTML=i.map(r=>{const l=s.cpp_ranges?.[r]||{min:0,max:100,mean:50},d=o[r]??l.mean,c=Math.max(l.min,Math.min(l.max,d)),u=((l.max-l.min)/50).toFixed(4);return`
      <div class="form-group">
        <label>${r.replace(/_/g," ")}</label>
        <input type="range" id="sim-${r}" min="${l.min}" max="${l.max}" step="${u}" value="${c}" />
        <div class="range-value" id="srv-${r}">${c.toFixed(2)}</div>
      </div>
    `}).join(""),i.forEach(r=>{const l=document.getElementById(`sim-${r}`),d=document.getElementById(`srv-${r}`);l.addEventListener("input",()=>{d.textContent=parseFloat(l.value).toFixed(2)})}),document.getElementById("btn-sim").addEventListener("click",()=>{Pe(i,e,n,t,s)})}function Pe(e,t,a,i,s){const n=document.getElementById("sim-result"),o={};e.forEach(g=>{const x=document.getElementById(`sim-${g}`);o[g]=x?parseFloat(x.value):0});let r=h.cluster,l=1/0;for(const[g,x]of Object.entries(t)){let $=0;e.forEach(I=>{const D=s.cpp_ranges?.[I]||{min:0,max:1},T=Math.max(D.max-D.min,.01);$+=Math.pow((o[I]-(x[I]||0))/T,2)}),$<l&&(l=$,r=g)}const d=a.filter(g=>g.cluster_name===r),c=["Hardness","Dissolution_Rate","Friability","Content_Uniformity","Disintegration_Time"],u=i.PHARMA_LIMITS||{},y=Math.min(5,d.length||1),v=d.map(g=>{let x=0;return e.forEach($=>{const I=s.cpp_ranges?.[$]||{min:0,max:1},D=Math.max(I.max-I.min,.01);x+=Math.pow(((o[$]||0)-(g[$]||0))/D,2)}),{...g,dist:Math.sqrt(x)}}).sort((g,x)=>g.dist-x.dist).slice(0,y),C={};c.forEach(g=>{const x=v.reduce(($,I)=>$+1/(I.dist+.001),0);C[g]=v.reduce(($,I)=>$+(I[g]||0)/(I.dist+.001),0)/x});const F=d.length?d.reduce((g,x)=>g+(x.total_CO2e_kg||0),0)/d.length:65,S=Math.sqrt(l)*5;C.total_CO2e_kg=F*(1+S*.05);const P={};let E=!0;c.forEach(g=>{const x=C[g],$=u[g]||{};let I=!0;$.min!==void 0&&x<$.min&&(I=!1),$.max!==void 0&&x>$.max&&(I=!1),P[g]=I,I||(E=!1)});let _=!1,f=0;for(const g of a){const x=(g.Hardness||0)>=(C.Hardness||0)&&(g.Dissolution_Rate||0)>=(C.Dissolution_Rate||0)&&(g.total_CO2e_kg||999)<=(C.total_CO2e_kg||999),$=(g.Hardness||0)>(C.Hardness||0)||(g.Dissolution_Rate||0)>(C.Dissolution_Rate||0)||(g.total_CO2e_kg||999)<(C.total_CO2e_kg||999);x&&$&&(_=!0,f++)}const w=c.map(g=>`<tr>
          <td>${g.replace(/_/g," ")}</td>
          <td>${C[g].toFixed(2)}</td>
          <td><span class="badge ${P[g]?"badge-pass":"badge-fail"}">${P[g]?"PASS":"FAIL"}</span></td>
        </tr>`).join("");n.innerHTML=`
      <div class="alert ${_?"alert-warn":"alert-ok"}">
        ${_?`DOMINATED — This configuration is dominated by ${f} existing Pareto batch(es). Consider adjusting parameters.`:"NON-DOMINATED — This configuration could extend the Pareto front!"}
      </div>

      <div class="grid-3" style="margin:1rem 0">
        <div class="metric-card">
          <div class="metric-value" style="color:var(--accent-blue)">${r.split(" ")[0]}</div>
          <p class="metric-label">Nearest Cluster</p>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color:${E?"var(--accent-green)":"var(--accent-red)"}">${E?"PASS":"FAIL"}</div>
          <p class="metric-label">Pharma Compliance</p>
        </div>
        <div class="metric-card">
          <div class="metric-value">${C.total_CO2e_kg.toFixed(1)} kg</div>
          <p class="metric-label">Estimated CO₂e</p>
        </div>
      </div>

      <h3 style="margin-bottom:0.5rem">Estimated CQA Outcomes</h3>
      <table class="data-table">
        <thead><tr><th>Attribute</th><th>Estimated Value</th><th>Compliant</th></tr></thead>
        <tbody>${w}</tbody>
      </table>
    `}async function Fe(e){const t={clusters:{},export_info:"CB-MOPA Golden Signature Export"};for(const n of G)try{const o=await b.signature(n);t.clusters[n]={cpp_params:e[n]||{},version:o.version,source:o.source,created_at:o.created_at}}catch{t.clusters[n]={cpp_params:e[n]||{}}}const a=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),i=URL.createObjectURL(a),s=document.createElement("a");s.href=i,s.download="golden_signatures_export.json",s.click(),URL.revokeObjectURL(i)}async function oe(e){N({showEmissionFactor:!0,onChange:()=>oe(e)});let t,a,i,s;try{[t,a,i]=await Promise.all([b.masterStats(),b.constraints(),b.carbonTargets().catch(()=>null)])}catch(f){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${f.message}</div>`;return}const n=t.batch_data?.[h.batchId]||t.batch_data?.[t.batch_ids[0]]||{},r=(a.CARBON_CONFIG||{}).regulatory_limit_kg||85,l=i?.current_target_kg||50,c=(n.total_energy_kWh||(n.total_CO2e_kg?n.total_CO2e_kg/.72:93))*h.emissionFactor,u=t.batch_ids.map(f=>{const w=t.batch_data?.[f]||{};return(w.total_energy_kWh||(w.total_CO2e_kg?w.total_CO2e_kg/.72:0))*h.emissionFactor}).filter(f=>f>0),y=u.slice(-20),v=u.length>=5?u.slice(-5).reduce((f,w)=>f+w,0)/5:c,C=u.length>=2?u[u.length-2]:c,F=c/r*100;if(e.innerHTML=`
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting  |  EF: <strong>${h.emissionFactor.toFixed(2)}</strong> kg CO₂/kWh</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-value">${c.toFixed(2)} kg</div>
        <p class="metric-label">Current Batch CO₂e</p>
        <div class="metric-delta ${c<C?"positive":"negative"}">${c-C>0?"+":""}${(c-C).toFixed(2)} kg vs prev</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${v.toFixed(2)} kg</div>
        <p class="metric-label">5-Batch Rolling Average</p>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:${F<=100?"var(--accent-green)":"var(--accent-red)"}">${F.toFixed(1)}%</div>
        <p class="metric-label">% vs Regulatory Target</p>
        <div class="metric-delta neutral">Target: ${r} kg</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:1.5rem">
      <div>
        <h2 class="section-title">CO₂e Gauge</h2>
        <div id="gauge-chart" class="chart-container" style="height:320px"></div>
      </div>
      <div>
        <h2 class="section-title">CO₂e Trend — Last 20 Batches</h2>
        <div id="trend-chart" class="chart-container" style="height:320px"></div>
      </div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Phase CO₂e Attribution</h2>
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div id="donut-chart" class="chart-container" style="height:350px"></div>
      <div id="phase-table"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Dynamic Target Adjustment</h2>
    <div class="grid-2" style="margin-bottom:1.5rem">
      <div id="target-chart" class="chart-container" style="height:280px"></div>
      <div id="target-info"></div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Shift Emission Factors</h2>
    <div id="shift-chart" class="chart-container" style="height:260px"></div>

    <hr class="divider" />

    <h2 class="section-title">Regulatory Compliance Status</h2>
    <div id="compliance-table"></div>
  `,k("gauge-chart",[{type:"indicator",mode:"gauge+number+delta",value:c,delta:{reference:l},gauge:{axis:{range:[0,r*1.5]},bar:{color:p.blue},steps:[{range:[0,l*.9],color:"rgba(39,174,96,0.3)"},{range:[l*.9,l],color:"rgba(243,156,18,0.3)"},{range:[l,r],color:"rgba(231,76,60,0.3)"}],threshold:{line:{color:p.red,width:4},thickness:.75,value:r}},number:{suffix:" kg",font:{size:28}},title:{text:`Batch CO₂e (EF: ${h.emissionFactor})`,font:{size:14}}}],{height:320,margin:{l:30,r:30,t:60,b:20}}),y.length){const f=y.map((g,x)=>`B${x+1}`),w=y.map(g=>g<=l?p.green:g<=r?p.amber:p.red);k("trend-chart",[{x:f,y,type:"bar",marker:{color:w},name:"CO₂e"},{x:f,y:f.map(()=>l),mode:"lines",line:{color:p.green,dash:"dash",width:2},name:"Internal Target"},{x:f,y:f.map(()=>r),mode:"lines",line:{color:p.red,dash:"dot",width:2},name:"Regulatory Limit"}],{height:320,yaxis:{title:"CO₂e (kg)"},showlegend:!1})}try{if(s=await b.trajectory(h.batchId),s&&s.length){const f={};s.forEach(T=>{f[T.Phase||"Unknown"]=(f[T.Phase||"Unknown"]||0)+(T.Energy_kWh||0)});const w=Object.keys(f),g=w.map(T=>f[T]),x=g.map(T=>T*h.emissionFactor);k("donut-chart",[{values:x,labels:w,type:"pie",hole:.55,marker:{colors:["#16A34A","#4F46E5","#EA580C","#9333EA","#DC2626","#0D9488","#D97706"].slice(0,w.length)},textinfo:"label+percent",textfont:{size:11}}],{title:`Phase CO₂e — Batch ${h.batchId} (EF: ${h.emissionFactor})`,height:350,legend:{orientation:"h",y:-.1,font:{size:11}}});const I=x.reduce((T,M)=>T+M,0),D=w.map((T,M)=>`<tr><td>${T}</td><td>${g[M].toFixed(2)} kWh</td><td>${x[M].toFixed(2)} kg</td><td>${(x[M]/I*100).toFixed(1)}%</td></tr>`).join("");document.getElementById("phase-table").innerHTML=`
        <h3 style="margin-bottom:0.5rem">Phase Breakdown</h3>
        <table class="data-table"><thead><tr><th>Phase</th><th>Energy</th><th>CO₂e</th><th>Share</th></tr></thead><tbody>${D}</tbody></table>
      `}}catch{}const S=l;k("target-chart",[{x:[`Current
Batch`,`Internal
Target`,`Regulatory
Limit`],y:[c,S,r],type:"bar",marker:{color:[c<=S?p.green:p.red,p.blue,p.red]},text:[`${c.toFixed(1)} kg`,`${S.toFixed(1)} kg`,`${r.toFixed(1)} kg`],textposition:"outside"}],{height:280,yaxis:{title:"CO₂e (kg)"}});const P=S-c;document.getElementById("target-info").innerHTML=`
    <h3 style="margin-bottom:1rem">Impact Summary</h3>
    <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value" style="color:${P>0?"var(--accent-green)":"var(--accent-red)"}; font-size:1.3rem">${P>0?"+":""}${P.toFixed(2)} kg</div><p class="metric-label">Headroom vs Target</p></div>
    <div class="metric-card"><div class="metric-value" style="font-size:1.3rem">${(c/r*100).toFixed(1)}%</div><p class="metric-label">Regulatory Usage</p></div>
  `;const E=["Morning (6-14)","Evening (14-22)","Night (22-6)"],_=[.68,.82,.55];k("shift-chart",[{x:E,y:_,type:"bar",marker:{color:[p.amber,p.red,p.green]},text:_.map(f=>`${f.toFixed(2)} kg/kWh`),textposition:"outside"}],{height:260,yaxis:{title:"kg CO₂/kWh"},title:`Grid Emission Factor by Shift (Your EF: ${h.emissionFactor.toFixed(2)})`}),Ae(n,a,c)}function Ae(e,t,a){const i=t.PHARMA_LIMITS||{},s=t.CQA_COLS||[],n=t.CARBON_CONFIG?.regulatory_limit_kg||85,o=[];s.forEach(l=>{const d=e[l]??0,c=i[l]||{};let u=!0,y="";c.min!==void 0&&c.max!==void 0?(u=d>=c.min&&d<=c.max,y=`[${c.min}, ${c.max}]`):c.min!==void 0?(u=d>=c.min,y=`≥ ${c.min}`):c.max!==void 0&&(u=d<=c.max,y=`≤ ${c.max}`),o.push(`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td><td>${y}</td><td><span class="badge ${u?"badge-pass":"badge-fail"}">${u?"PASS":"FAIL"}</span></td></tr>`)});const r=a<=n;o.push(`<tr><td>Total CO₂e (EF: ${h.emissionFactor})</td><td>${a.toFixed(2)} kg</td><td>≤ ${n} kg</td><td><span class="badge ${r?"badge-pass":"badge-fail"}">${r?"PASS":"FAIL"}</span></td></tr>`),document.getElementById("compliance-table").innerHTML=`
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${o.join("")}</tbody>
    </table>
  `}let m=null;async function De(e){q(),e.innerHTML=`
    <div class="page-header">
      <h1>Real-Time Simulation</h1>
      <p>Watch CB-MOPA process batches in real-time — drift detection, causal recommendations, and adaptive learning in action.</p>
    </div>

    <div class="sim-controls">
      <div class="sim-controls-row">
        <div class="sim-speed">
          <label for="sim-speed">Batch Interval</label>
          <input type="range" id="sim-speed" min="1" max="10" step="1" value="3" style="accent-color:var(--accent-blue);width:180px" />
          <span id="sim-speed-val" style="font-weight:700;color:var(--accent-blue)">3s</span>
        </div>
        <div class="sim-buttons">
          <button class="btn btn-primary" id="btn-play">▶ Start</button>
          <button class="btn btn-outline" id="btn-pause" disabled>⏸ Pause</button>
          <button class="btn btn-outline" id="btn-reset">↺ Reset</button>
        </div>
        <div class="sim-progress-info">
          <span id="sim-batch-counter" style="font-weight:700;font-size:1.1rem">0 / 0</span>
          <span style="color:var(--text-muted);font-size:0.85rem">batches processed</span>
        </div>
      </div>
      <div class="sim-progress-bar" style="margin-top:1rem;background:var(--bg-input);border-radius:8px;height:8px;overflow:hidden">
        <div id="sim-progress" style="height:100%;width:0%;background:var(--accent-blue);border-radius:8px;transition:width 0.3s ease"></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:1.5rem;gap:2rem">
      <div>
        <h2 class="section-title">Live Metrics</h2>
        <div class="grid-2" id="sim-metrics" style="margin-bottom:1.5rem">
          <div class="metric-card"><div class="metric-value" id="m-batch">—</div><p class="metric-label">Current Batch</p></div>
          <div class="metric-card"><div class="metric-value" id="m-cluster">—</div><p class="metric-label">Cluster</p></div>
          <div class="metric-card"><div class="metric-value" id="m-alarm" style="color:var(--accent-green)">—</div><p class="metric-label">Drift Alarm</p></div>
          <div class="metric-card"><div class="metric-value" id="m-co2e">—</div><p class="metric-label">CO₂e (kg)</p></div>
        </div>

        <h2 class="section-title">CO₂e Trend (Live)</h2>
        <div id="sim-trend" class="chart-container" style="height:280px"></div>

        <h2 class="section-title" style="margin-top:1.5rem">Drift Score History</h2>
        <div id="sim-drift-chart" class="chart-container" style="height:240px"></div>
      </div>

      <div>
        <h2 class="section-title">Event Log</h2>
        <div id="sim-log" style="max-height:640px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-white);padding:0.5rem"></div>
      </div>
    </div>

    <hr class="divider" />

    <h2 class="section-title">Batch Quality Heatmap</h2>
    <div id="sim-heatmap" class="chart-container" style="height:200px"></div>
  `;let t,a,i,s;try{[t,a,i,s]=await Promise.all([b.masterStats(),b.centroids(),b.clusterBatchMap().catch(()=>null),b.constraints()])}catch(l){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${l.message}</div>`;return}const n={};if(i)for(const[l,d]of Object.entries(i))(d||[]).forEach(c=>{n[c]=l});m={batchIds:t.batch_ids||[],batchData:t.batch_data||{},centroids:a,constraints:s,batchCluster:n,currentIndex:0,running:!1,timer:null,speed:3e3,history:{labels:[],co2e:[],driftScores:[],alarms:[],hardness:[],dissolution:[]}};const o=document.getElementById("sim-speed"),r=document.getElementById("sim-speed-val");o.addEventListener("input",()=>{m.speed=parseInt(o.value)*1e3,r.textContent=o.value+"s",m.running&&(clearInterval(m.timer),m.timer=setInterval(K,m.speed))}),document.getElementById("btn-play").addEventListener("click",Me),document.getElementById("btn-pause").addEventListener("click",ce),document.getElementById("btn-reset").addEventListener("click",He),document.getElementById("sim-batch-counter").textContent=`0 / ${m.batchIds.length}`,O("system","Simulation ready",`${m.batchIds.length} batches loaded. Press Start to begin.`)}function Me(){!m||m.currentIndex>=m.batchIds.length||(m.running=!0,document.getElementById("btn-play").disabled=!0,document.getElementById("btn-pause").disabled=!1,O("system","Simulation started",`Speed: ${m.speed/1e3}s per batch`),K(),m.timer=setInterval(K,m.speed))}function ce(){m&&(m.running=!1,clearInterval(m.timer),document.getElementById("btn-play").disabled=!1,document.getElementById("btn-pause").disabled=!0,document.getElementById("btn-play").textContent="▶ Resume",O("system","Simulation paused",`Processed ${m.currentIndex} / ${m.batchIds.length}`))}function He(){m&&(m.running=!1,clearInterval(m.timer),m.currentIndex=0,m.history={labels:[],co2e:[],driftScores:[],alarms:[],hardness:[],dissolution:[]},document.getElementById("btn-play").disabled=!1,document.getElementById("btn-play").textContent="▶ Start",document.getElementById("btn-pause").disabled=!0,document.getElementById("sim-batch-counter").textContent=`0 / ${m.batchIds.length}`,document.getElementById("sim-progress").style.width="0%",document.getElementById("m-batch").textContent="—",document.getElementById("m-cluster").textContent="—",document.getElementById("m-alarm").textContent="—",document.getElementById("m-alarm").style.color="var(--text-muted)",document.getElementById("m-co2e").textContent="—",document.getElementById("sim-log").innerHTML="",document.getElementById("sim-trend").innerHTML="",document.getElementById("sim-drift-chart").innerHTML="",document.getElementById("sim-heatmap").innerHTML="",O("system","Simulation reset","Ready to start again."))}async function K(){if(!m||m.currentIndex>=m.batchIds.length){ce(),O("complete","Simulation complete",`All ${m.batchIds.length} batches processed.`),document.getElementById("btn-play").disabled=!0;return}const e=m.batchIds[m.currentIndex],t=m.batchData[e]||{},a=m.batchCluster[e]||"Balanced Operational Golden",i=m.centroids[a]||{},s=t.total_CO2e_kg||0,n=t.Hardness||0,o=t.Dissolution_Rate||0;document.getElementById("m-batch").textContent=e,document.getElementById("m-cluster").textContent=a.split(" ")[0],document.getElementById("m-co2e").textContent=s.toFixed(1),m.currentIndex++;const r=(m.currentIndex/m.batchIds.length*100).toFixed(0);document.getElementById("sim-batch-counter").textContent=`${m.currentIndex} / ${m.batchIds.length}`,document.getElementById("sim-progress").style.width=r+"%",O("data",`Batch ${e} received`,`Cluster: ${a} | CO₂e: ${s.toFixed(2)} kg`);let l="OK",d=0;try{const c={};(m.constraints.CPP_COLS||[]).forEach(v=>{c[v]=t[v]||i[v]||0});const u=await b.driftCheck({batch_id:e,cpp_params:c,cluster_name:a});l=u.overall_alarm||"OK",u.drift_details&&u.drift_details.length&&(d=u.drift_details.reduce((v,C)=>v+(C.drift_score||0),0)/u.drift_details.length);const y=document.getElementById("m-alarm");if(l==="OK"?(y.textContent="OK",y.style.color="var(--accent-green)",O("ok","Drift: OK",`Batch ${e} within golden envelope (avg drift: ${d.toFixed(4)})`)):l==="WARNING"?(y.textContent="WARNING",y.style.color="var(--accent-amber)",O("warning","Drift: WARNING",`Batch ${e} shows partial deviation (avg drift: ${d.toFixed(4)})`)):(y.textContent="CRITICAL",y.style.color="var(--accent-red)",O("critical","Drift: CRITICAL",`Batch ${e} significant deviation detected!`)),l!=="OK")try{const v=await b.recommendations(e,a);if(v&&v.pathway_a){const C=Object.entries(v.pathway_a.parameter_changes||{}).map(([F,S])=>`${F}: ${S>0?"+":""}${S.toFixed(2)}`).join(", ");O("rec","Recommendation generated",`Yield Guard: ${C} | Expected CO₂e: ${(v.pathway_a.expected_co2e||0).toFixed(1)} kg`)}}catch{}}catch(c){O("warning","Drift check skipped",`${e}: ${c.message}`)}m.history.labels.push(e),m.history.co2e.push(s),m.history.driftScores.push(d),m.history.alarms.push(l),m.history.hardness.push(n),m.history.dissolution.push(o),Re(),Ge(),Ne()}function Re(){const e=m.history,t=e.alarms.map(a=>a==="OK"?p.green:a==="WARNING"?p.amber:p.red);k("sim-trend",[{x:e.labels,y:e.co2e,type:"bar",marker:{color:t},name:"CO₂e"},{x:e.labels,y:e.labels.map(()=>50),mode:"lines",line:{color:p.green,dash:"dash",width:1.5},name:"Target"},{x:e.labels,y:e.labels.map(()=>85),mode:"lines",line:{color:p.red,dash:"dot",width:1.5},name:"Regulatory"}],{height:280,xaxis:{title:"Batch"},yaxis:{title:"CO₂e (kg)"},showlegend:!1,margin:{...Q.margin,b:60}})}function Ge(){const e=m.history,t=e.alarms.map(a=>a==="OK"?p.green:a==="WARNING"?p.amber:p.red);k("sim-drift-chart",[{x:e.labels,y:e.driftScores,type:"scatter",mode:"lines+markers",line:{color:p.blue,width:2},marker:{color:t,size:8},name:"Avg Drift Score"}],{height:240,xaxis:{title:"Batch"},yaxis:{title:"Drift Score"},margin:{...Q.margin,b:60}})}function Ne(){const e=m.history;k("sim-heatmap",[{z:[e.hardness,e.dissolution,e.co2e],x:e.labels,y:["Hardness","Dissolution","CO₂e"],type:"heatmap",colorscale:"RdYlGn",reversescale:!1}],{height:200,margin:{l:100,r:20,t:10,b:60},xaxis:{title:"Batch"}})}function O(e,t,a){const i=document.getElementById("sim-log");if(!i)return;const s={system:"var(--text-muted)",data:"var(--accent-blue)",ok:"var(--accent-green)",warning:"var(--accent-amber)",critical:"var(--accent-red)",rec:"#9333EA",complete:"var(--accent-blue)"},n={system:"⚙",data:"📦",ok:"✅",warning:"⚠️",critical:"🚨",rec:"💡",complete:"🏁"},o=new Date().toLocaleTimeString(),r=document.createElement("div");for(r.style.cssText="padding:8px 12px;border-bottom:1px solid var(--border-light);font-size:0.85rem;animation:fadeIn 0.3s ease",r.innerHTML=`
        <div style="display:flex;align-items:center;gap:8px">
            <span>${n[e]||"•"}</span>
            <strong style="color:${s[e]||"inherit"}">${t}</strong>
            <span style="margin-left:auto;color:var(--text-muted);font-size:0.75rem">${o}</span>
        </div>
        <div style="color:var(--text-secondary);font-size:0.8rem;margin-top:2px;padding-left:26px">${a}</div>
    `,i.prepend(r);i.children.length>100;)i.removeChild(i.lastChild)}A("/",be);A("/dashboard",ye);A("/live-batch",ie);A("/recommendations",ne);A("/signatures",re);A("/carbon",oe);A("/simulation",De);me();ue();
