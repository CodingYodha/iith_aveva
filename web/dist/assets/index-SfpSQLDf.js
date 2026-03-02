(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=a(s);fetch(s.href,n)}})();const se="/api";async function k(e,t,a=null){const i={method:e,headers:{"Content-Type":"application/json"}};a&&(i.body=JSON.stringify(a));const s=await fetch(`${se}/${t}`,i);if(!s.ok){const n=await s.json().catch(()=>({detail:s.statusText}));throw new Error(n.detail||s.statusText)}return s.json()}const b={get:e=>k("GET",e),post:(e,t)=>k("POST",e,t),health:()=>fetch("/health").then(e=>e.json()).catch(()=>null),centroids:()=>k("GET","data/centroids"),envelopes:()=>k("GET","data/envelopes"),pareto:()=>k("GET","data/pareto"),masterStats:()=>k("GET","data/master-stats"),trajectory:e=>k("GET",`data/trajectory/${e}`),clusterBatchMap:()=>k("GET","data/cluster-batch-map"),constraints:()=>k("GET","data/constraints"),driftCheck:e=>k("POST","batch/drift-check",e),recommendations:(e,t)=>k("GET",`recommendations/${e}/${t}`),logDecision:e=>k("POST","decisions/",e),decisionHistory:(e=50)=>k("GET",`decisions/history?limit=${e}`),signature:e=>k("GET",`signatures/${e}`),signatureHistory:e=>k("GET",`signatures/${e}/history`),carbonTargets:()=>k("GET","carbon/targets"),preferenceSummary:()=>k("GET","preferences/summary")},ne=[{path:"/",label:"Home"},{path:"/dashboard",label:"Dashboard"},{path:"/live-batch",label:"Live Batch"},{path:"/recommendations",label:"Recommendations"},{path:"/signatures",label:"Golden Signatures"},{path:"/carbon",label:"Carbon Targets"}];function re(){const e=document.getElementById("navbar"),t=ne.map(a=>`<a href="#${a.path}">${a.label}</a>`).join("");e.innerHTML=`
    <div class="nav-brand">CB-MOPA</div>
    <div class="nav-links">${t}</div>
    <div class="nav-status" id="nav-health">
      <span class="status-dot" id="health-dot"></span>
      <span id="health-text">Checking...</span>
    </div>
  `,V(),setInterval(V,15e3)}async function V(){const e=document.getElementById("health-dot"),t=document.getElementById("health-text");if(!(!e||!t))try{const a=await b.health();a&&a.status==="ok"?(e.className="status-dot ok",t.textContent="API Connected"):(e.className="status-dot fail",t.textContent="API Error")}catch{e.className="status-dot fail",t.textContent="API Offline"}}const j={};let M=null;function O(e,t){j[e]=t}function oe(){return window.location.hash.slice(1)||"/"}async function q(){const e=oe(),t=j[e]||j["/"];if(!t)return;M&&typeof M=="function"&&(M(),M=null),document.querySelectorAll(".nav-links a").forEach(i=>{i.classList.toggle("active",i.getAttribute("href")===`#${e}`)});const a=document.getElementById("main-content");a.innerHTML='<div class="spinner"></div>';try{M=await t(a)}catch(i){a.innerHTML=`<div class="alert alert-crit">Page error: ${i.message}</div>`,console.error(i)}}function ce(){window.addEventListener("hashchange",q),q()}const Y=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"],d={cluster:Y[2],batchId:"T001",emissionFactor:.72};function le(){document.getElementById("sidebar").classList.remove("hidden")}function J(){document.getElementById("sidebar").classList.add("hidden")}function de(){let e=document.getElementById("loading-overlay");e||(e=document.createElement("div"),e.id="loading-overlay",e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
        <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
        <div style="color:var(--text-secondary);font-weight:600">Updating analytics...</div>
      </div>
    `,e.style.cssText=`
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
      background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
    `,document.body.appendChild(e))}function me(){const e=document.getElementById("loading-overlay");e&&e.remove()}function R(e={}){le();const t=document.getElementById("sidebar"),a=e.showEmissionFactor!==!1;if(t.innerHTML=`
    <h3>Controls</h3>

    <label for="sb-cluster">Golden Cluster</label>
    <select id="sb-cluster">
      ${Y.map(i=>`<option value="${i}" ${i===d.cluster?"selected":""}>${i}</option>`).join("")}
    </select>

    <label for="sb-batch">Batch ID</label>
    <input type="text" id="sb-batch" value="${d.batchId}" />

    ${a?`
      <label for="sb-ef">Emission Factor (kg CO₂/kWh)</label>
      <input type="range" class="sidebar-range" id="sb-ef"
             min="0.3" max="1.2" step="0.01" value="${d.emissionFactor}" />
      <div class="sidebar-range-value" id="sb-ef-val">${d.emissionFactor.toFixed(2)}</div>
    `:""}

    <button class="btn btn-primary btn-full" id="sb-apply" style="margin-top:1.2rem">Apply Changes</button>
  `,t.querySelector("#sb-cluster").addEventListener("change",i=>{d.cluster=i.target.value}),t.querySelector("#sb-batch").addEventListener("input",i=>{d.batchId=i.target.value.trim()||"T001"}),a){const i=t.querySelector("#sb-ef"),s=t.querySelector("#sb-ef-val");i.addEventListener("input",n=>{d.emissionFactor=parseFloat(n.target.value),s.textContent=d.emissionFactor.toFixed(2)})}t.querySelector("#sb-apply").addEventListener("click",async()=>{if(e.onChange){de(),await new Promise(i=>setTimeout(i,50));try{await e.onChange()}finally{me()}}})}function he(e){J(),e.innerHTML=`
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
  `}async function ue(e){J(),e.innerHTML=`
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
  `;try{const t=await b.health(),a=document.getElementById("status-cards");if(!a)return;const i=t&&t.status==="ok",s=t&&t.db_connected;a.children[0].innerHTML=`<div class="metric-value" style="color:${i?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">API Backend</p>`,a.children[1].innerHTML=`<div class="metric-value" style="color:${s?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">Database</p>`}catch{}}const pe={paper_bgcolor:"#FFFFFF",plot_bgcolor:"#FAFAFA",font:{family:"Inter, sans-serif",color:"#1A1A2E",size:12},margin:{l:60,r:20,t:40,b:50},xaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"},yaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"}},ve={displayModeBar:!1,responsive:!0},p={blue:"#4F46E5",green:"#16A34A",orange:"#EA580C",red:"#DC2626",amber:"#D97706",muted:"#9CA3AF"},X={"Max Quality Golden":p.green,"Deep Decarbonization Golden":p.blue,"Balanced Operational Golden":p.orange};function T(e,t,a={},i={}){const s=document.getElementById(e);if(!s)return;const n={...pe,...a},o={...ve,...i};Plotly.newPlot(s,t,n,o)}let N=null,D=null,z=null,B=null;async function Z(e){R({showEmissionFactor:!0,onChange:()=>Z(e)}),e.innerHTML=`
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
  `;try{[N,D,z,B]=await Promise.all([N||b.masterStats(),D||b.centroids(),z||b.envelopes(),B||b.constraints()])}catch(t){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${t.message}</div>`;return}ge(),be(),fe(),G(),xe(),_e(),document.getElementById("btn-drift").addEventListener("click",ye),document.getElementById("env-phase").addEventListener("change",()=>{ee(),G()}),document.getElementById("env-sensor").addEventListener("change",G)}function ge(){const e=document.getElementById("batch-caption");e&&(e.textContent=`Cluster: ${d.cluster} | Batch: ${d.batchId} | EF: ${d.emissionFactor} kg CO₂/kWh`)}function U(){const e={};return B.CPP_COLS.forEach(t=>{const a=document.getElementById(`cpp-${t}`);e[t]=a?parseFloat(a.value):0}),e}function be(){const e=document.getElementById("cpp-sliders"),t=D[d.cluster]||{},a=N.cpp_ranges;e.innerHTML=B.CPP_COLS.map(i=>{const s=a[i]||{min:0,max:100,mean:50},n=t[i]!==void 0?t[i]:s.mean,o=Math.max(s.min,Math.min(s.max,n)),r=((s.max-s.min)/100).toFixed(4);return`
      <div class="form-group">
        <label>${i.replace(/_/g," ")}</label>
        <input type="range" id="cpp-${i}" min="${s.min}" max="${s.max}" step="${r}" value="${o}" />
        <div class="range-value" id="rv-${i}">${o.toFixed(2)}</div>
      </div>
    `}).join(""),B.CPP_COLS.forEach(i=>{const s=document.getElementById(`cpp-${i}`),n=document.getElementById(`rv-${i}`);s.addEventListener("input",()=>{n.textContent=parseFloat(s.value).toFixed(2)})})}async function ye(){const e=document.getElementById("btn-drift"),t=document.getElementById("drift-result");e.disabled=!0,e.textContent="Running drift detection...";try{const a=await b.driftCheck({batch_id:d.batchId,cpp_params:U(),cluster_name:d.cluster}),i=a.overall_alarm||"UNKNOWN";let s="alert-info",n=i;i==="OK"?(s="alert-ok",n="OK — Batch within golden envelope"):i==="WARNING"?(s="alert-warn",n="WARNING — Partial drift detected"):(s="alert-crit",n="CRITICAL — Significant deviation");let o="";a.drift_details&&a.drift_details.length&&(o=`
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
      `),t.innerHTML=`<div class="alert ${s}">OVERALL: ${n}</div>${o}`}catch(a){t.innerHTML=`<div class="alert alert-crit">Drift check failed: ${a.message}</div>`}finally{e.disabled=!1,e.textContent="Check Drift"}}function fe(){const e=document.getElementById("env-phase"),t=Object.keys(B.PHASE_SENSOR_MAP);e.innerHTML=t.map(a=>`<option value="${a}">${a}</option>`).join(""),ee()}function ee(){const e=document.getElementById("env-phase").value,t=document.getElementById("env-sensor"),a=B.PHASE_SENSOR_MAP[e]||[];t.innerHTML=a.map(i=>`<option value="${i}">${i}</option>`).join("")}function G(){const e=document.getElementById("env-phase")?.value,t=document.getElementById("env-sensor")?.value;if(!e||!t)return;const a=z?.[d.cluster]?.[e]?.[t];if(!a){document.getElementById("envelope-chart").innerHTML='<div class="alert alert-info">No envelope data for this selection</div>';return}const i=a.mean,s=a.upper,n=a.lower,o=Array.from({length:i.length},(x,C)=>C),r=U(),l=D[d.cluster]||{};let m=0;B.CPP_COLS.forEach(x=>{const C=r[x]||0,v=l[x]||.01;m+=Math.abs(C-v)/Math.max(Math.abs(v),.01)*100}),m/=B.CPP_COLS.length;const c=Math.sqrt(i.reduce((x,C)=>x+Math.pow(C-i.reduce((v,w)=>v+w,0)/i.length,2),0)/i.length)||1,u=Math.max(.02,m/100)*c;let f=d.batchId.split("").reduce((x,C)=>x+C.charCodeAt(0),0);const g=()=>(f=(f*16807+0)%2147483647,(f/2147483647-.5)*2),$=i.map(x=>x+g()*u),L=[{x:[...o,...o.slice().reverse()],y:[...s,...n.slice().reverse()],fill:"toself",fillcolor:"rgba(46,134,193,0.15)",line:{color:"rgba(0,0,0,0)"},name:"±3σ Envelope",hoverinfo:"skip"},{x:o,y:i,mode:"lines",line:{color:p.blue,width:2,dash:"dot"},name:"Golden Mean (DBA)"},{x:o,y:s,mode:"lines",line:{color:p.blue,width:1,dash:"dash"},name:"Upper +3σ",opacity:.6},{x:o,y:n,mode:"lines",line:{color:p.blue,width:1,dash:"dash"},name:"Lower -3σ",opacity:.6},{x:o,y:$,mode:"lines",line:{color:p.orange,width:2.5},name:`Batch ${d.batchId}`}],S=[],I=[];$.forEach((x,C)=>{(x<n[C]||x>s[C])&&(S.push(C),I.push(x))}),S.length&&L.push({x:S,y:I,mode:"markers",marker:{color:p.red,size:8,symbol:"x"},name:"Outside Envelope"}),T("envelope-chart",L,{title:`Batch ${d.batchId} vs ${d.cluster} — ${e} / ${t}`,xaxis:{title:"Time Step"},yaxis:{title:t.replace(/_/g," ")},height:420,legend:{orientation:"h",y:-.18}})}function xe(){const e=U(),t=D[d.cluster]||{},a=B.CPP_COLS.map(c=>c.replace(/_/g," ")),i=B.CPP_COLS.map(c=>e[c]||0),s=B.CPP_COLS.map(c=>t[c]||0),n=Math.max(...i,...s,1),o=i.map(c=>c/n),r=s.map(c=>c/n);T("radar-chart",[{type:"scatterpolar",r:[...r,r[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(79,70,229,0.25)",line:{color:p.blue,width:3},marker:{size:7,color:p.blue},name:"Golden Centroid"},{type:"scatterpolar",r:[...o,o[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(234,88,12,0.25)",line:{color:p.orange,width:3},marker:{size:7,color:p.orange},name:"Current Batch"}],{polar:{bgcolor:"#FAFAFA",radialaxis:{visible:!0,range:[0,1.1],gridcolor:"#E5E7EB"},angularaxis:{gridcolor:"#E5E7EB"}},height:400,showlegend:!0,legend:{orientation:"h",y:-.1}});const l=document.getElementById("cpp-table-container"),m=B.CPP_COLS.map(c=>{const u=(e[c]||0).toFixed(2),f=(t[c]||0).toFixed(2),g=t[c]?((e[c]-t[c])/t[c]*100).toFixed(1):"0.0";return`<tr><td>${c.replace(/_/g," ")}</td><td>${u}</td><td>${f}</td><td>${g}%</td></tr>`}).join("");l.innerHTML=`
    <h3 style="margin-bottom:0.5rem">CPP Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Current</th><th>Golden</th><th>Dev %</th></tr></thead>
      <tbody>${m}</tbody>
    </table>
  `}async function _e(){try{const e=await b.trajectory(d.batchId);if(!e||!e.length){document.getElementById("energy-chart").innerHTML='<div class="alert alert-info">No trajectory data for this batch</div>';return}const t={};e.forEach(l=>{const m=l.Phase||"Unknown";t[m]=(t[m]||0)+(l.Energy_kWh||0)});const a=Object.keys(t).sort((l,m)=>t[l]-t[m]),i=a.map(l=>t[l]);T("energy-chart",[{y:a,x:i,type:"bar",orientation:"h",marker:{color:i,colorscale:"Viridis"},text:i.map(l=>`${l.toFixed(2)} kWh`),textposition:"outside",name:`Batch ${d.batchId}`}],{title:`Energy Consumption by Phase — Batch ${d.batchId}`,xaxis:{title:"Energy (kWh)"},yaxis:{title:"Phase"},height:350,margin:{l:120,r:60,t:50,b:40}});const s=e.reduce((l,m)=>l+(m.Energy_kWh||0),0),n=s*d.emissionFactor,r=50-n;document.getElementById("co2-metrics").innerHTML=`
      <div class="metric-card"><div class="metric-value">${s.toFixed(2)}</div><p class="metric-label">Total Energy (kWh)</p></div>
      <div class="metric-card"><div class="metric-value">${n.toFixed(2)}</div><p class="metric-label">CO₂e (kg)</p></div>
      <div class="metric-card"><div class="metric-value" style="color:${r>0?"var(--accent-green)":"var(--accent-red)"}">${r>0?"+":""}${r.toFixed(2)}</div><p class="metric-label">Target Headroom (kg)</p></div>
    `}catch{document.getElementById("energy-chart").innerHTML=`<div class="alert alert-info">No trajectory data for batch ${d.batchId}</div>`}}const $e={pathway_name:"Yield Guard",param_changes:[{param:"Drying_Temp",old_value:60,new_value:54,delta_pct:-10}],expected_cqa_delta:{Hardness:.08,Friability:-.1,Dissolution_Rate:.03,Disintegration_Time:-1.08,Content_Uniformity:.02,total_CO2e_kg:-.14},expected_co2_change:-.14,safety_check:"PASS",causal_confidence:.82,preference_utility:.42},Ce={pathway_name:"Carbon Savior",param_changes:[{param:"Machine_Speed",old_value:150,new_value:135,delta_pct:-10}],expected_cqa_delta:{Hardness:.02,Friability:-.03,Dissolution_Rate:.01,Disintegration_Time:-.5,Content_Uniformity:-.08,total_CO2e_kg:-.25},expected_co2_change:-.25,safety_check:"PASS",causal_confidence:.78,preference_utility:-.69};async function te(e){R({showEmissionFactor:!1,onChange:()=>te(e)});let t={},a={};try{const m=await b.masterStats();t=m.batch_data?.[d.batchId]||m.batch_data?.[m.batch_ids[0]]||{},a=await b.constraints()}catch{}const i=a.CQA_COLS||["Hardness","Friability","Dissolution_Rate","Disintegration_Time","Content_Uniformity","Tablet_Weight"],s=a.PHARMA_LIMITS||{},n=i.map(m=>{const c=t[m]??0,u=s[m]||{};let f=!0,g="";return u.min!==void 0&&u.max!==void 0?(f=c>=u.min&&c<=u.max,g=`[${u.min}, ${u.max}]`):u.min!==void 0?(f=c>=u.min,g=`≥ ${u.min}`):u.max!==void 0&&(f=c<=u.max,g=`≤ ${u.max}`),`<div class="metric-card">
      <div class="metric-value" style="font-size:1.4rem;color:${f?"var(--accent-green)":"var(--accent-red)"}">${c.toFixed(2)}</div>
      <p class="metric-label">${m.replace(/_/g," ")}</p>
      <div class="metric-delta neutral">Target: ${g}</div>
    </div>`}).join("");let o=null,r=null,l=!1;try{const m=await b.recommendations(d.batchId,d.cluster);o=m.pathway_a,r=m.pathway_b}catch{}o||(l=!0,o=$e,r=Ce),e.innerHTML=`
    <div class="page-header">
      <h1>Causal Recommendation Engine</h1>
      <p>Do-calculus structural causal models estimate the causal effect of each process parameter change.
      The BoTorch PairwiseGP re-ranks recommendations by your historical preferences.</p>
    </div>

    <h2 class="section-title">Current Batch: ${d.batchId}</h2>
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
  `,K("card-a",o,"impact-a"),r&&K("card-b",r,"impact-b"),document.getElementById("btn-exec-a").addEventListener("click",()=>W(o,r,"A")),document.getElementById("btn-exec-b").addEventListener("click",()=>W(o,r,"B")),document.getElementById("btn-modify").addEventListener("click",()=>Ee(o,r,a.CPP_COLS||[])),ke()}function K(e,t,a){const i=document.getElementById(e),s=t.param_changes||[],n=t.expected_cqa_delta||{},o=t.safety_check||"UNKNOWN",r=t.causal_confidence||.8,l=t.preference_utility??0,m=s.map(g=>`<tr><td>${g.param}</td><td>${g.old_value}</td><td>${g.new_value}</td><td>${g.delta_pct>0?"+":""}${g.delta_pct.toFixed(1)}%</td></tr>`).join("");i.innerHTML=`
    <h3>${t.pathway_name}</h3>
    <div class="subtitle">GP Utility Score: ${l.toFixed(3)}</div>
    ${s.length?`<table class="data-table" style="margin-bottom:1rem">
      <thead><tr><th>Param</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
      <tbody>${m}</tbody>
    </table>`:""}
    <div id="${a}" style="height:200px;margin-bottom:1rem"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${t.expected_co2_change>0?"+":""}${t.expected_co2_change.toFixed(4)} kg</div><p class="metric-label">CO₂e Change</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${(r*100).toFixed(0)}%</div><p class="metric-label">Confidence</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem;color:${o==="PASS"?"var(--accent-green)":"var(--accent-red)"}">${o}</div><p class="metric-label">Safety</p></div>
    </div>
  `;const c=Object.keys(n),u=Object.values(n),f=u.map(g=>g>0?p.green:g<0?p.red:p.muted);T(a,[{x:u,y:c.map(g=>g.replace(/_/g," ")),type:"bar",orientation:"h",marker:{color:f},text:u.map(g=>`${g>0?"+":""}${g.toFixed(4)}`),textposition:"outside"}],{title:"Expected CQA Impact",height:200,margin:{l:120,r:60,t:35,b:20},xaxis:{title:"Delta"},font:{size:11}})}async function W(e,t,a,i=null,s=""){const n=document.getElementById("decision-result");try{const o=await b.logDecision({batch_id:d.batchId,pathway_a:e,pathway_b:t,chosen:a,modified_params:i,reason:s,target_config:d.cluster});if(o){const r=o.total_comparisons||0;n.innerHTML=`<div class="alert alert-ok">Decision logged. ${o.preference_model_updated?"Preference model updated.":"Recorded."} (${r}/3 comparisons)</div>`}}catch(o){n.innerHTML=`<div class="alert alert-crit">Failed: ${o.message}</div>`}}function Ee(e,t,a){const i=document.getElementById("modify-form");i.style.display="block",i.innerHTML=`
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
  `,document.getElementById("btn-submit-mod").addEventListener("click",()=>{const s={};a.forEach(o=>{const r=parseFloat(document.getElementById(`mod-${o}`).value)||0;r!==0&&(s[o]=r)});const n=document.getElementById("mod-reason").value;W(e,t,"MODIFIED",s,n),i.style.display="none"})}async function ke(){try{const e=await b.preferenceSummary();if(!e)return;const t=e.quality_preferred_count||0,a=e.carbon_preferred_count||0;T("pref-chart",[{x:[`Yield Guard
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
      `}}catch{}}const H=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"];async function ae(e){R({showEmissionFactor:!1,onChange:()=>ae(e)}),e.innerHTML=`
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
        ${H.map(s=>`<option value="${s}">${s}</option>`).join("")}
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
  `;const[t,a,i]=await Promise.all([b.pareto().catch(()=>[]),b.centroids().catch(()=>({})),b.constraints().catch(()=>({}))]);t.length?we(t):document.getElementById("pareto-chart").innerHTML='<div class="alert alert-info">No Pareto front data found.</div>',Pe(a),Q(H[0]),document.getElementById("hist-cluster").addEventListener("change",s=>Q(s.target.value)),document.getElementById("btn-show-sim").addEventListener("click",()=>{document.getElementById("sim-panel").style.display="block",document.getElementById("btn-show-sim").style.display="none",Be(a,i)}),document.getElementById("btn-export").addEventListener("click",()=>Se(a))}function we(e){const t=[];for(const[a,i]of Object.entries(X)){const s=e.filter(n=>n.cluster_name===a);s.length&&t.push({type:"scatter3d",mode:"markers",x:s.map(n=>n.Dissolution_Rate||0),y:s.map(n=>n.Hardness||0),z:s.map(n=>n.total_CO2e_kg||n.total_energy_kWh||0),marker:{size:5,color:i,opacity:.8},name:a,hovertext:s.map(n=>`Cluster: ${a}<br>Hardness: ${(n.Hardness||0).toFixed(2)}<br>Dissolution: ${(n.Dissolution_Rate||0).toFixed(2)}<br>Friability: ${(n.Friability||0).toFixed(3)}<br>CO₂e: ${(n.total_CO2e_kg||0).toFixed(2)}`),hoverinfo:"text"})}T("pareto-chart",t,{scene:{xaxis:{title:"Dissolution Rate"},yaxis:{title:"Hardness"},zaxis:{title:"CO₂e (kg)"},bgcolor:"#FAFAFA"},height:550,margin:{l:0,r:0,t:30,b:0},legend:{orientation:"h",y:-.05,font:{size:12}}})}async function Pe(e){const t=document.getElementById("cluster-cards"),a=[];for(const i of H){const s=X[i]||p.blue,n=e[i]||{};let o="";try{const l=await b.signature(i);o=`<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">v${l.version} — ${l.source} — Active since ${(l.created_at||"").slice(0,19)}</div>`}catch{o='<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">Signature info unavailable</div>'}const r=Object.entries(n).map(([l,m])=>`<tr><td>${l.replace(/_/g," ")}</td><td>${m.toFixed(2)}</td></tr>`).join("");a.push(`
      <div class="card">
        <h3><span class="dot" style="background:${s}"></span>${i}</h3>
        ${o}
        <table class="data-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${r}</tbody></table>
      </div>
    `)}t.innerHTML=a.join("")}async function Q(e){const t=document.getElementById("version-timeline");try{const a=await b.signatureHistory(e);if(!a||!a.length){t.innerHTML='<div class="alert alert-info">No history available.</div>';return}t.innerHTML=a.map(i=>{const s=i.version||"?",n=i.source||"unknown",o=(i.created_at||"").slice(0,19),r=i.trigger_batch_id,l=i.is_active?'<span class="badge badge-pass" style="margin-left:8px">ACTIVE</span>':"";return`
        <div class="timeline-entry">
          <span class="version-badge">v${s}</span>
          <strong style="margin-left:8px">${n.toUpperCase()}</strong>${l}<br/>
          <span style="color:var(--text-muted)">${o}</span>
          ${r?`<br/><span style="color:var(--accent-green)">Triggered by batch: <strong>${r}</strong></span>`:""}
        </div>
      `}).join("")}catch(a){t.innerHTML=`<div class="alert alert-warn">Could not load history: ${a.message}</div>`}}async function Be(e,t){const a=document.getElementById("sim-sliders"),i=t.CPP_COLS||[];let s,n;try{[s,n]=await Promise.all([b.masterStats(),b.pareto()])}catch{return}const o=e[d.cluster]||{};a.innerHTML=i.map(r=>{const l=s.cpp_ranges?.[r]||{min:0,max:100,mean:50},m=o[r]??l.mean,c=Math.max(l.min,Math.min(l.max,m)),u=((l.max-l.min)/50).toFixed(4);return`
      <div class="form-group">
        <label>${r.replace(/_/g," ")}</label>
        <input type="range" id="sim-${r}" min="${l.min}" max="${l.max}" step="${u}" value="${c}" />
        <div class="range-value" id="srv-${r}">${c.toFixed(2)}</div>
      </div>
    `}).join(""),i.forEach(r=>{const l=document.getElementById(`sim-${r}`),m=document.getElementById(`srv-${r}`);l.addEventListener("input",()=>{m.textContent=parseFloat(l.value).toFixed(2)})}),document.getElementById("btn-sim").addEventListener("click",()=>{Te(i,e,n,t,s)})}function Te(e,t,a,i,s){const n=document.getElementById("sim-result"),o={};e.forEach(h=>{const y=document.getElementById(`sim-${h}`);o[h]=y?parseFloat(y.value):0});let r=d.cluster,l=1/0;for(const[h,y]of Object.entries(t)){let _=0;e.forEach(E=>{const F=s.cpp_ranges?.[E]||{min:0,max:1},P=Math.max(F.max-F.min,.01);_+=Math.pow((o[E]-(y[E]||0))/P,2)}),_<l&&(l=_,r=h)}const m=a.filter(h=>h.cluster_name===r),c=["Hardness","Dissolution_Rate","Friability","Content_Uniformity","Disintegration_Time"],u=i.PHARMA_LIMITS||{},f=Math.min(5,m.length||1),g=m.map(h=>{let y=0;return e.forEach(_=>{const E=s.cpp_ranges?.[_]||{min:0,max:1},F=Math.max(E.max-E.min,.01);y+=Math.pow(((o[_]||0)-(h[_]||0))/F,2)}),{...h,dist:Math.sqrt(y)}}).sort((h,y)=>h.dist-y.dist).slice(0,f),$={};c.forEach(h=>{const y=g.reduce((_,E)=>_+1/(E.dist+.001),0);$[h]=g.reduce((_,E)=>_+(E[h]||0)/(E.dist+.001),0)/y});const L=m.length?m.reduce((h,y)=>h+(y.total_CO2e_kg||0),0)/m.length:65,S=Math.sqrt(l)*5;$.total_CO2e_kg=L*(1+S*.05);const I={};let x=!0;c.forEach(h=>{const y=$[h],_=u[h]||{};let E=!0;_.min!==void 0&&y<_.min&&(E=!1),_.max!==void 0&&y>_.max&&(E=!1),I[h]=E,E||(x=!1)});let C=!1,v=0;for(const h of a){const y=(h.Hardness||0)>=($.Hardness||0)&&(h.Dissolution_Rate||0)>=($.Dissolution_Rate||0)&&(h.total_CO2e_kg||999)<=($.total_CO2e_kg||999),_=(h.Hardness||0)>($.Hardness||0)||(h.Dissolution_Rate||0)>($.Dissolution_Rate||0)||(h.total_CO2e_kg||999)<($.total_CO2e_kg||999);y&&_&&(C=!0,v++)}const w=c.map(h=>`<tr>
          <td>${h.replace(/_/g," ")}</td>
          <td>${$[h].toFixed(2)}</td>
          <td><span class="badge ${I[h]?"badge-pass":"badge-fail"}">${I[h]?"PASS":"FAIL"}</span></td>
        </tr>`).join("");n.innerHTML=`
      <div class="alert ${C?"alert-warn":"alert-ok"}">
        ${C?`DOMINATED — This configuration is dominated by ${v} existing Pareto batch(es). Consider adjusting parameters.`:"NON-DOMINATED — This configuration could extend the Pareto front!"}
      </div>

      <div class="grid-3" style="margin:1rem 0">
        <div class="metric-card">
          <div class="metric-value" style="color:var(--accent-blue)">${r.split(" ")[0]}</div>
          <p class="metric-label">Nearest Cluster</p>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color:${x?"var(--accent-green)":"var(--accent-red)"}">${x?"PASS":"FAIL"}</div>
          <p class="metric-label">Pharma Compliance</p>
        </div>
        <div class="metric-card">
          <div class="metric-value">${$.total_CO2e_kg.toFixed(1)} kg</div>
          <p class="metric-label">Estimated CO₂e</p>
        </div>
      </div>

      <h3 style="margin-bottom:0.5rem">Estimated CQA Outcomes</h3>
      <table class="data-table">
        <thead><tr><th>Attribute</th><th>Estimated Value</th><th>Compliant</th></tr></thead>
        <tbody>${w}</tbody>
      </table>
    `}async function Se(e){const t={clusters:{},export_info:"CB-MOPA Golden Signature Export"};for(const n of H)try{const o=await b.signature(n);t.clusters[n]={cpp_params:e[n]||{},version:o.version,source:o.source,created_at:o.created_at}}catch{t.clusters[n]={cpp_params:e[n]||{}}}const a=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),i=URL.createObjectURL(a),s=document.createElement("a");s.href=i,s.download="golden_signatures_export.json",s.click(),URL.revokeObjectURL(i)}async function ie(e){R({showEmissionFactor:!0,onChange:()=>ie(e)});let t,a,i,s;try{[t,a,i]=await Promise.all([b.masterStats(),b.constraints(),b.carbonTargets().catch(()=>null)])}catch(v){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${v.message}</div>`;return}const n=t.batch_data?.[d.batchId]||t.batch_data?.[t.batch_ids[0]]||{},r=(a.CARBON_CONFIG||{}).regulatory_limit_kg||85,l=i?.current_target_kg||50,c=(n.total_energy_kWh||(n.total_CO2e_kg?n.total_CO2e_kg/.72:93))*d.emissionFactor,u=t.batch_ids.map(v=>{const w=t.batch_data?.[v]||{};return(w.total_energy_kWh||(w.total_CO2e_kg?w.total_CO2e_kg/.72:0))*d.emissionFactor}).filter(v=>v>0),f=u.slice(-20),g=u.length>=5?u.slice(-5).reduce((v,w)=>v+w,0)/5:c,$=u.length>=2?u[u.length-2]:c,L=c/r*100;if(e.innerHTML=`
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting  |  EF: <strong>${d.emissionFactor.toFixed(2)}</strong> kg CO₂/kWh</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-value">${c.toFixed(2)} kg</div>
        <p class="metric-label">Current Batch CO₂e</p>
        <div class="metric-delta ${c<$?"positive":"negative"}">${c-$>0?"+":""}${(c-$).toFixed(2)} kg vs prev</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${g.toFixed(2)} kg</div>
        <p class="metric-label">5-Batch Rolling Average</p>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:${L<=100?"var(--accent-green)":"var(--accent-red)"}">${L.toFixed(1)}%</div>
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
  `,T("gauge-chart",[{type:"indicator",mode:"gauge+number+delta",value:c,delta:{reference:l},gauge:{axis:{range:[0,r*1.5]},bar:{color:p.blue},steps:[{range:[0,l*.9],color:"rgba(39,174,96,0.3)"},{range:[l*.9,l],color:"rgba(243,156,18,0.3)"},{range:[l,r],color:"rgba(231,76,60,0.3)"}],threshold:{line:{color:p.red,width:4},thickness:.75,value:r}},number:{suffix:" kg",font:{size:28}},title:{text:`Batch CO₂e (EF: ${d.emissionFactor})`,font:{size:14}}}],{height:320,margin:{l:30,r:30,t:60,b:20}}),f.length){const v=f.map((h,y)=>`B${y+1}`),w=f.map(h=>h<=l?p.green:h<=r?p.amber:p.red);T("trend-chart",[{x:v,y:f,type:"bar",marker:{color:w},name:"CO₂e"},{x:v,y:v.map(()=>l),mode:"lines",line:{color:p.green,dash:"dash",width:2},name:"Internal Target"},{x:v,y:v.map(()=>r),mode:"lines",line:{color:p.red,dash:"dot",width:2},name:"Regulatory Limit"}],{height:320,yaxis:{title:"CO₂e (kg)"},showlegend:!1})}try{if(s=await b.trajectory(d.batchId),s&&s.length){const v={};s.forEach(P=>{v[P.Phase||"Unknown"]=(v[P.Phase||"Unknown"]||0)+(P.Energy_kWh||0)});const w=Object.keys(v),h=w.map(P=>v[P]),y=h.map(P=>P*d.emissionFactor);T("donut-chart",[{values:y,labels:w,type:"pie",hole:.55,marker:{colors:["#16A34A","#4F46E5","#EA580C","#9333EA","#DC2626","#0D9488","#D97706"].slice(0,w.length)},textinfo:"label+percent",textfont:{size:11}}],{title:`Phase CO₂e — Batch ${d.batchId} (EF: ${d.emissionFactor})`,height:350,legend:{orientation:"h",y:-.1,font:{size:11}}});const E=y.reduce((P,A)=>P+A,0),F=w.map((P,A)=>`<tr><td>${P}</td><td>${h[A].toFixed(2)} kWh</td><td>${y[A].toFixed(2)} kg</td><td>${(y[A]/E*100).toFixed(1)}%</td></tr>`).join("");document.getElementById("phase-table").innerHTML=`
        <h3 style="margin-bottom:0.5rem">Phase Breakdown</h3>
        <table class="data-table"><thead><tr><th>Phase</th><th>Energy</th><th>CO₂e</th><th>Share</th></tr></thead><tbody>${F}</tbody></table>
      `}}catch{}const S=l;T("target-chart",[{x:[`Current
Batch`,`Internal
Target`,`Regulatory
Limit`],y:[c,S,r],type:"bar",marker:{color:[c<=S?p.green:p.red,p.blue,p.red]},text:[`${c.toFixed(1)} kg`,`${S.toFixed(1)} kg`,`${r.toFixed(1)} kg`],textposition:"outside"}],{height:280,yaxis:{title:"CO₂e (kg)"}});const I=S-c;document.getElementById("target-info").innerHTML=`
    <h3 style="margin-bottom:1rem">Impact Summary</h3>
    <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value" style="color:${I>0?"var(--accent-green)":"var(--accent-red)"}; font-size:1.3rem">${I>0?"+":""}${I.toFixed(2)} kg</div><p class="metric-label">Headroom vs Target</p></div>
    <div class="metric-card"><div class="metric-value" style="font-size:1.3rem">${(c/r*100).toFixed(1)}%</div><p class="metric-label">Regulatory Usage</p></div>
  `;const x=["Morning (6-14)","Evening (14-22)","Night (22-6)"],C=[.68,.82,.55];T("shift-chart",[{x,y:C,type:"bar",marker:{color:[p.amber,p.red,p.green]},text:C.map(v=>`${v.toFixed(2)} kg/kWh`),textposition:"outside"}],{height:260,yaxis:{title:"kg CO₂/kWh"},title:`Grid Emission Factor by Shift (Your EF: ${d.emissionFactor.toFixed(2)})`}),Ie(n,a,c)}function Ie(e,t,a){const i=t.PHARMA_LIMITS||{},s=t.CQA_COLS||[],n=t.CARBON_CONFIG?.regulatory_limit_kg||85,o=[];s.forEach(l=>{const m=e[l]??0,c=i[l]||{};let u=!0,f="";c.min!==void 0&&c.max!==void 0?(u=m>=c.min&&m<=c.max,f=`[${c.min}, ${c.max}]`):c.min!==void 0?(u=m>=c.min,f=`≥ ${c.min}`):c.max!==void 0&&(u=m<=c.max,f=`≤ ${c.max}`),o.push(`<tr><td>${l.replace(/_/g," ")}</td><td>${m.toFixed(2)}</td><td>${f}</td><td><span class="badge ${u?"badge-pass":"badge-fail"}">${u?"PASS":"FAIL"}</span></td></tr>`)});const r=a<=n;o.push(`<tr><td>Total CO₂e (EF: ${d.emissionFactor})</td><td>${a.toFixed(2)} kg</td><td>≤ ${n} kg</td><td><span class="badge ${r?"badge-pass":"badge-fail"}">${r?"PASS":"FAIL"}</span></td></tr>`),document.getElementById("compliance-table").innerHTML=`
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${o.join("")}</tbody>
    </table>
  `}O("/",he);O("/dashboard",ue);O("/live-batch",Z);O("/recommendations",te);O("/signatures",ae);O("/carbon",ie);re();ce();
