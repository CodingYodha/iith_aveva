(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function a(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=a(s);fetch(s.href,n)}})();const ee="/api";async function y(e,t,a=null){const i={method:e,headers:{"Content-Type":"application/json"}};a&&(i.body=JSON.stringify(a));const s=await fetch(`${ee}/${t}`,i);if(!s.ok){const n=await s.json().catch(()=>({detail:s.statusText}));throw new Error(n.detail||s.statusText)}return s.json()}const g={get:e=>y("GET",e),post:(e,t)=>y("POST",e,t),health:()=>fetch("/health").then(e=>e.json()).catch(()=>null),centroids:()=>y("GET","data/centroids"),envelopes:()=>y("GET","data/envelopes"),pareto:()=>y("GET","data/pareto"),masterStats:()=>y("GET","data/master-stats"),trajectory:e=>y("GET",`data/trajectory/${e}`),clusterBatchMap:()=>y("GET","data/cluster-batch-map"),constraints:()=>y("GET","data/constraints"),driftCheck:e=>y("POST","batch/drift-check",e),recommendations:(e,t)=>y("GET",`recommendations/${e}/${t}`),logDecision:e=>y("POST","decisions/",e),decisionHistory:(e=50)=>y("GET",`decisions/history?limit=${e}`),signature:e=>y("GET",`signatures/${e}`),signatureHistory:e=>y("GET",`signatures/${e}/history`),carbonTargets:()=>y("GET","carbon/targets"),preferenceSummary:()=>y("GET","preferences/summary")},te=[{path:"/",label:"Home"},{path:"/dashboard",label:"Dashboard"},{path:"/live-batch",label:"Live Batch"},{path:"/recommendations",label:"Recommendations"},{path:"/signatures",label:"Golden Signatures"},{path:"/carbon",label:"Carbon Targets"}];function ae(){const e=document.getElementById("navbar"),t=te.map(a=>`<a href="#${a.path}">${a.label}</a>`).join("");e.innerHTML=`
    <div class="nav-brand">CB-MOPA</div>
    <div class="nav-links">${t}</div>
    <div class="nav-status" id="nav-health">
      <span class="status-dot" id="health-dot"></span>
      <span id="health-text">Checking...</span>
    </div>
  `,N(),setInterval(N,15e3)}async function N(){const e=document.getElementById("health-dot"),t=document.getElementById("health-text");if(!(!e||!t))try{const a=await g.health();a&&a.status==="ok"?(e.className="status-dot ok",t.textContent="API Connected"):(e.className="status-dot fail",t.textContent="API Error")}catch{e.className="status-dot fail",t.textContent="API Offline"}}const D={};let L=null;function P(e,t){D[e]=t}function ie(){return window.location.hash.slice(1)||"/"}async function z(){const e=ie(),t=D[e]||D["/"];if(!t)return;L&&typeof L=="function"&&(L(),L=null),document.querySelectorAll(".nav-links a").forEach(i=>{i.classList.toggle("active",i.getAttribute("href")===`#${e}`)});const a=document.getElementById("main-content");a.innerHTML='<div class="spinner"></div>';try{L=await t(a)}catch(i){a.innerHTML=`<div class="alert alert-crit">Page error: ${i.message}</div>`,console.error(i)}}function se(){window.addEventListener("hashchange",z),z()}const V=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"],m={cluster:V[2],batchId:"T001",emissionFactor:.72};function ne(){document.getElementById("sidebar").classList.remove("hidden")}function q(){document.getElementById("sidebar").classList.add("hidden")}function A(e={}){ne();const t=document.getElementById("sidebar"),a=e.showEmissionFactor!==!1;if(t.innerHTML=`
    <h3>Controls</h3>

    <label for="sb-cluster">Golden Cluster</label>
    <select id="sb-cluster">
      ${V.map(i=>`<option value="${i}" ${i===m.cluster?"selected":""}>${i}</option>`).join("")}
    </select>

    <label for="sb-batch">Batch ID</label>
    <input type="text" id="sb-batch" value="${m.batchId}" />

    ${a?`
      <label for="sb-ef">Emission Factor (kg CO₂/kWh)</label>
      <input type="range" class="sidebar-range" id="sb-ef"
             min="0.3" max="1.2" step="0.01" value="${m.emissionFactor}" />
      <div class="sidebar-range-value" id="sb-ef-val">${m.emissionFactor.toFixed(2)}</div>
    `:""}
  `,t.querySelector("#sb-cluster").addEventListener("change",i=>{m.cluster=i.target.value,e.onChange&&e.onChange()}),t.querySelector("#sb-batch").addEventListener("change",i=>{m.batchId=i.target.value.trim()||"T001",e.onChange&&e.onChange()}),a){const i=t.querySelector("#sb-ef"),s=t.querySelector("#sb-ef-val");i.addEventListener("input",n=>{m.emissionFactor=parseFloat(n.target.value),s.textContent=m.emissionFactor.toFixed(2)}),i.addEventListener("change",()=>{e.onChange&&e.onChange()})}}function re(e){q(),e.innerHTML=`
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
  `}async function oe(e){q(),e.innerHTML=`
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
  `;try{const t=await g.health(),a=document.getElementById("status-cards");if(!a)return;const i=t&&t.status==="ok",s=t&&t.db_connected;a.children[0].innerHTML=`<div class="metric-value" style="color:${i?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">API Backend</p>`,a.children[1].innerHTML=`<div class="metric-value" style="color:${s?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">Database</p>`}catch{}}const ce={paper_bgcolor:"#FFFFFF",plot_bgcolor:"#FAFAFA",font:{family:"Inter, sans-serif",color:"#1A1A2E",size:12},margin:{l:60,r:20,t:40,b:50},xaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"},yaxis:{gridcolor:"#E5E7EB",zerolinecolor:"#D1D5DB"}},le={displayModeBar:!1,responsive:!0},v={blue:"#4F46E5",green:"#16A34A",orange:"#EA580C",red:"#DC2626",amber:"#D97706",muted:"#9CA3AF"},K={"Max Quality Golden":v.green,"Deep Decarbonization Golden":v.blue,"Balanced Operational Golden":v.orange};function E(e,t,a={},i={}){const s=document.getElementById(e);if(!s)return;const n={...ce,...a},r={...le,...i};Plotly.newPlot(s,t,n,r)}let H=null,I=null,R=null,C=null;async function de(e){A({showEmissionFactor:!0}),e.innerHTML=`
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
  `;try{[H,I,R,C]=await Promise.all([H||g.masterStats(),I||g.centroids(),R||g.envelopes(),C||g.constraints()])}catch(t){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${t.message}</div>`;return}me(),he(),ve(),M(),pe(),ge(),document.getElementById("btn-drift").addEventListener("click",ue),document.getElementById("env-phase").addEventListener("change",()=>{Q(),M()}),document.getElementById("env-sensor").addEventListener("change",M)}function me(){const e=document.getElementById("batch-caption");e&&(e.textContent=`Cluster: ${m.cluster} | Batch: ${m.batchId} | EF: ${m.emissionFactor} kg CO₂/kWh`)}function j(){const e={};return C.CPP_COLS.forEach(t=>{const a=document.getElementById(`cpp-${t}`);e[t]=a?parseFloat(a.value):0}),e}function he(){const e=document.getElementById("cpp-sliders"),t=I[m.cluster]||{},a=H.cpp_ranges;e.innerHTML=C.CPP_COLS.map(i=>{const s=a[i]||{min:0,max:100,mean:50},n=t[i]!==void 0?t[i]:s.mean,r=Math.max(s.min,Math.min(s.max,n)),o=((s.max-s.min)/100).toFixed(4);return`
      <div class="form-group">
        <label>${i.replace(/_/g," ")}</label>
        <input type="range" id="cpp-${i}" min="${s.min}" max="${s.max}" step="${o}" value="${r}" />
        <div class="range-value" id="rv-${i}">${r.toFixed(2)}</div>
      </div>
    `}).join(""),C.CPP_COLS.forEach(i=>{const s=document.getElementById(`cpp-${i}`),n=document.getElementById(`rv-${i}`);s.addEventListener("input",()=>{n.textContent=parseFloat(s.value).toFixed(2)})})}async function ue(){const e=document.getElementById("btn-drift"),t=document.getElementById("drift-result");e.disabled=!0,e.textContent="Running drift detection...";try{const a=await g.driftCheck({batch_id:m.batchId,cpp_params:j(),cluster_name:m.cluster}),i=a.overall_alarm||"UNKNOWN";let s="alert-info",n=i;i==="OK"?(s="alert-ok",n="OK — Batch within golden envelope"):i==="WARNING"?(s="alert-warn",n="WARNING — Partial drift detected"):(s="alert-crit",n="CRITICAL — Significant deviation");let r="";a.drift_details&&a.drift_details.length&&(r=`
        <table class="data-table" style="margin-top:1rem">
          <thead><tr><th>Phase</th><th>Sensor</th><th>Alarm</th><th>Drift Score</th><th>% Outside</th></tr></thead>
          <tbody>${a.drift_details.map(o=>`
            <tr>
              <td>${o.phase}</td>
              <td>${o.sensor}</td>
              <td><span class="badge badge-${o.alarm_level==="OK"?"pass":o.alarm_level==="WARNING"?"warn":"fail"}">${o.alarm_level}</span></td>
              <td>${o.drift_score.toFixed(4)}</td>
              <td>${o.percent_outside.toFixed(1)}%</td>
            </tr>
          `).join("")}</tbody>
        </table>
      `),t.innerHTML=`<div class="alert ${s}">OVERALL: ${n}</div>${r}`}catch(a){t.innerHTML=`<div class="alert alert-crit">Drift check failed: ${a.message}</div>`}finally{e.disabled=!1,e.textContent="Check Drift"}}function ve(){const e=document.getElementById("env-phase"),t=Object.keys(C.PHASE_SENSOR_MAP);e.innerHTML=t.map(a=>`<option value="${a}">${a}</option>`).join(""),Q()}function Q(){const e=document.getElementById("env-phase").value,t=document.getElementById("env-sensor"),a=C.PHASE_SENSOR_MAP[e]||[];t.innerHTML=a.map(i=>`<option value="${i}">${i}</option>`).join("")}function M(){const e=document.getElementById("env-phase")?.value,t=document.getElementById("env-sensor")?.value;if(!e||!t)return;const a=R?.[m.cluster]?.[e]?.[t];if(!a){document.getElementById("envelope-chart").innerHTML='<div class="alert alert-info">No envelope data for this selection</div>';return}const i=a.mean,s=a.upper,n=a.lower,r=Array.from({length:i.length},(f,h)=>h),o=j(),l=I[m.cluster]||{};let d=0;C.CPP_COLS.forEach(f=>{const h=o[f]||0,x=l[f]||.01;d+=Math.abs(h-x)/Math.max(Math.abs(x),.01)*100}),d/=C.CPP_COLS.length;const c=Math.sqrt(i.reduce((f,h)=>f+Math.pow(h-i.reduce((x,_)=>x+_,0)/i.length,2),0)/i.length)||1,u=Math.max(.02,d/100)*c;let b=m.batchId.split("").reduce((f,h)=>f+h.charCodeAt(0),0);const p=()=>(b=(b*16807+0)%2147483647,(b/2147483647-.5)*2),T=i.map(f=>f+p()*u),w=[{x:[...r,...r.slice().reverse()],y:[...s,...n.slice().reverse()],fill:"toself",fillcolor:"rgba(46,134,193,0.15)",line:{color:"rgba(0,0,0,0)"},name:"±3σ Envelope",hoverinfo:"skip"},{x:r,y:i,mode:"lines",line:{color:v.blue,width:2,dash:"dot"},name:"Golden Mean (DBA)"},{x:r,y:s,mode:"lines",line:{color:v.blue,width:1,dash:"dash"},name:"Upper +3σ",opacity:.6},{x:r,y:n,mode:"lines",line:{color:v.blue,width:1,dash:"dash"},name:"Lower -3σ",opacity:.6},{x:r,y:T,mode:"lines",line:{color:v.orange,width:2.5},name:`Batch ${m.batchId}`}],B=[],O=[];T.forEach((f,h)=>{(f<n[h]||f>s[h])&&(B.push(h),O.push(f))}),B.length&&w.push({x:B,y:O,mode:"markers",marker:{color:v.red,size:8,symbol:"x"},name:"Outside Envelope"}),E("envelope-chart",w,{title:`Batch ${m.batchId} vs ${m.cluster} — ${e} / ${t}`,xaxis:{title:"Time Step"},yaxis:{title:t.replace(/_/g," ")},height:420,legend:{orientation:"h",y:-.18}})}function pe(){const e=j(),t=I[m.cluster]||{},a=C.CPP_COLS.map(c=>c.replace(/_/g," ")),i=C.CPP_COLS.map(c=>e[c]||0),s=C.CPP_COLS.map(c=>t[c]||0),n=Math.max(...i,...s,1),r=i.map(c=>c/n),o=s.map(c=>c/n);E("radar-chart",[{type:"scatterpolar",r:[...o,o[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(46,134,193,0.2)",line:{color:v.blue,width:2},name:"Golden Centroid"},{type:"scatterpolar",r:[...r,r[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(230,126,34,0.2)",line:{color:v.orange,width:2},name:"Current Batch"}],{polar:{bgcolor:"#FAFAFA",radialaxis:{visible:!0,range:[0,1.1],gridcolor:"#E5E7EB"},angularaxis:{gridcolor:"#E5E7EB"}},height:400,showlegend:!0,legend:{orientation:"h",y:-.1}});const l=document.getElementById("cpp-table-container"),d=C.CPP_COLS.map(c=>{const u=(e[c]||0).toFixed(2),b=(t[c]||0).toFixed(2),p=t[c]?((e[c]-t[c])/t[c]*100).toFixed(1):"0.0";return`<tr><td>${c.replace(/_/g," ")}</td><td>${u}</td><td>${b}</td><td>${p}%</td></tr>`}).join("");l.innerHTML=`
    <h3 style="margin-bottom:0.5rem">CPP Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Current</th><th>Golden</th><th>Dev %</th></tr></thead>
      <tbody>${d}</tbody>
    </table>
  `}async function ge(){try{const e=await g.trajectory(m.batchId);if(!e||!e.length){document.getElementById("energy-chart").innerHTML='<div class="alert alert-info">No trajectory data for this batch</div>';return}const t={};e.forEach(l=>{const d=l.Phase||"Unknown";t[d]=(t[d]||0)+(l.Energy_kWh||0)});const a=Object.keys(t).sort((l,d)=>t[l]-t[d]),i=a.map(l=>t[l]);E("energy-chart",[{y:a,x:i,type:"bar",orientation:"h",marker:{color:i,colorscale:"Viridis"},text:i.map(l=>`${l.toFixed(2)} kWh`),textposition:"outside",name:`Batch ${m.batchId}`}],{title:`Energy Consumption by Phase — Batch ${m.batchId}`,xaxis:{title:"Energy (kWh)"},yaxis:{title:"Phase"},height:350,margin:{l:120,r:60,t:50,b:40}});const s=e.reduce((l,d)=>l+(d.Energy_kWh||0),0),n=s*m.emissionFactor,o=50-n;document.getElementById("co2-metrics").innerHTML=`
      <div class="metric-card"><div class="metric-value">${s.toFixed(2)}</div><p class="metric-label">Total Energy (kWh)</p></div>
      <div class="metric-card"><div class="metric-value">${n.toFixed(2)}</div><p class="metric-label">CO₂e (kg)</p></div>
      <div class="metric-card"><div class="metric-value" style="color:${o>0?"var(--accent-green)":"var(--accent-red)"}">${o>0?"+":""}${o.toFixed(2)}</div><p class="metric-label">Target Headroom (kg)</p></div>
    `}catch{document.getElementById("energy-chart").innerHTML=`<div class="alert alert-info">No trajectory data for batch ${m.batchId}</div>`}}const be={pathway_name:"Yield Guard",param_changes:[{param:"Drying_Temp",old_value:60,new_value:54,delta_pct:-10}],expected_cqa_delta:{Hardness:.08,Friability:-.1,Dissolution_Rate:.03,Disintegration_Time:-1.08,Content_Uniformity:.02,total_CO2e_kg:-.14},expected_co2_change:-.14,safety_check:"PASS",causal_confidence:.82,preference_utility:.42},ye={pathway_name:"Carbon Savior",param_changes:[{param:"Machine_Speed",old_value:150,new_value:135,delta_pct:-10}],expected_cqa_delta:{Hardness:.02,Friability:-.03,Dissolution_Rate:.01,Disintegration_Time:-.5,Content_Uniformity:-.08,total_CO2e_kg:-.25},expected_co2_change:-.25,safety_check:"PASS",causal_confidence:.78,preference_utility:-.69};async function Y(e){A({showEmissionFactor:!1,onChange:()=>Y(e)});let t={},a={};try{const d=await g.masterStats();t=d.batch_data?.[m.batchId]||d.batch_data?.[d.batch_ids[0]]||{},a=await g.constraints()}catch{}const i=a.CQA_COLS||["Hardness","Friability","Dissolution_Rate","Disintegration_Time","Content_Uniformity","Tablet_Weight"],s=a.PHARMA_LIMITS||{},n=i.map(d=>{const c=t[d]??0,u=s[d]||{};let b=!0,p="";return u.min!==void 0&&u.max!==void 0?(b=c>=u.min&&c<=u.max,p=`[${u.min}, ${u.max}]`):u.min!==void 0?(b=c>=u.min,p=`≥ ${u.min}`):u.max!==void 0&&(b=c<=u.max,p=`≤ ${u.max}`),`<div class="metric-card">
      <div class="metric-value" style="font-size:1.4rem;color:${b?"var(--accent-green)":"var(--accent-red)"}">${c.toFixed(2)}</div>
      <p class="metric-label">${d.replace(/_/g," ")}</p>
      <div class="metric-delta neutral">Target: ${p}</div>
    </div>`}).join("");let r=null,o=null,l=!1;try{const d=await g.recommendations(m.batchId,m.cluster);r=d.pathway_a,o=d.pathway_b}catch{}r||(l=!0,r=be,o=ye),e.innerHTML=`
    <div class="page-header">
      <h1>Causal Recommendation Engine</h1>
      <p>Do-calculus structural causal models estimate the causal effect of each process parameter change.
      The BoTorch PairwiseGP re-ranks recommendations by your historical preferences.</p>
    </div>

    <h2 class="section-title">Current Batch: ${m.batchId}</h2>
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
      <button class="btn btn-success btn-full" id="btn-exec-a">Execute Pathway A (${r.pathway_name})</button>
      <button class="btn btn-primary btn-full" id="btn-exec-b">Execute Pathway B (${o?.pathway_name||"B"})</button>
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
  `,W("card-a",r,"impact-a"),o&&W("card-b",o,"impact-b"),document.getElementById("btn-exec-a").addEventListener("click",()=>G(r,o,"A")),document.getElementById("btn-exec-b").addEventListener("click",()=>G(r,o,"B")),document.getElementById("btn-modify").addEventListener("click",()=>fe(r,o,a.CPP_COLS||[])),xe()}function W(e,t,a){const i=document.getElementById(e),s=t.param_changes||[],n=t.expected_cqa_delta||{},r=t.safety_check||"UNKNOWN",o=t.causal_confidence||.8,l=t.preference_utility??0,d=s.map(p=>`<tr><td>${p.param}</td><td>${p.old_value}</td><td>${p.new_value}</td><td>${p.delta_pct>0?"+":""}${p.delta_pct.toFixed(1)}%</td></tr>`).join("");i.innerHTML=`
    <h3>${t.pathway_name}</h3>
    <div class="subtitle">GP Utility Score: ${l.toFixed(3)}</div>
    ${s.length?`<table class="data-table" style="margin-bottom:1rem">
      <thead><tr><th>Param</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
      <tbody>${d}</tbody>
    </table>`:""}
    <div id="${a}" style="height:200px;margin-bottom:1rem"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${t.expected_co2_change>0?"+":""}${t.expected_co2_change.toFixed(4)} kg</div><p class="metric-label">CO₂e Change</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${(o*100).toFixed(0)}%</div><p class="metric-label">Confidence</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem;color:${r==="PASS"?"var(--accent-green)":"var(--accent-red)"}">${r}</div><p class="metric-label">Safety</p></div>
    </div>
  `;const c=Object.keys(n),u=Object.values(n),b=u.map(p=>p>0?v.green:p<0?v.red:v.muted);E(a,[{x:u,y:c.map(p=>p.replace(/_/g," ")),type:"bar",orientation:"h",marker:{color:b},text:u.map(p=>`${p>0?"+":""}${p.toFixed(4)}`),textposition:"outside"}],{title:"Expected CQA Impact",height:200,margin:{l:120,r:60,t:35,b:20},xaxis:{title:"Delta"},font:{size:11}})}async function G(e,t,a,i=null,s=""){const n=document.getElementById("decision-result");try{const r=await g.logDecision({batch_id:m.batchId,pathway_a:e,pathway_b:t,chosen:a,modified_params:i,reason:s,target_config:m.cluster});if(r){const o=r.total_comparisons||0;n.innerHTML=`<div class="alert alert-ok">Decision logged. ${r.preference_model_updated?"Preference model updated.":"Recorded."} (${o}/3 comparisons)</div>`}}catch(r){n.innerHTML=`<div class="alert alert-crit">Failed: ${r.message}</div>`}}function fe(e,t,a){const i=document.getElementById("modify-form");i.style.display="block",i.innerHTML=`
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
  `,document.getElementById("btn-submit-mod").addEventListener("click",()=>{const s={};a.forEach(r=>{const o=parseFloat(document.getElementById(`mod-${r}`).value)||0;o!==0&&(s[r]=o)});const n=document.getElementById("mod-reason").value;G(e,t,"MODIFIED",s,n),i.style.display="none"})}async function xe(){try{const e=await g.preferenceSummary();if(!e)return;const t=e.quality_preferred_count||0,a=e.carbon_preferred_count||0;E("pref-chart",[{x:[`Yield Guard
(Quality)`],y:[t],type:"bar",marker:{color:v.green},text:[String(t)],textposition:"outside",name:"Quality"},{x:[`Carbon Savior
(Decarb)`],y:[a],type:"bar",marker:{color:v.blue},text:[String(a)],textposition:"outside",name:"Carbon"}],{title:"Pathway Preference Distribution",yaxis:{title:"Times Chosen"},height:300,showlegend:!1});const i=e.status==="active"?'<span class="badge badge-pass">PairwiseGP Active</span>':'<span class="badge badge-warn">Cold Start</span>';document.getElementById("pref-stats").innerHTML=`
      <h3 style="margin-bottom:1rem">Model Status</h3>
      <div style="margin-bottom:1rem">${i}</div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.total_decisions}</div><p class="metric-label">Total Decisions</p></div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.comparisons_count}</div><p class="metric-label">Comparisons</p></div>
      <div class="metric-card"><div class="metric-value">${(e.quality_preference_pct||0).toFixed(0)}%</div><p class="metric-label">Quality Preference</p></div>
    `}catch{}try{const e=await g.decisionHistory(10);if(e&&e.length){const t=e.map(a=>`<tr><td>${a.batch_id||""}</td><td>${a.chosen_pathway||""}</td><td>${a.target_config||""}</td><td>${(a.timestamp||"").slice(0,19)}</td></tr>`).join("");document.getElementById("decision-history").innerHTML=`
        <h3 style="margin:1rem 0 0.5rem">Recent Decision Log</h3>
        <table class="data-table"><thead><tr><th>Batch</th><th>Chosen</th><th>Config</th><th>Time</th></tr></thead><tbody>${t}</tbody></table>
      `}}catch{}}const F=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"];async function Ce(e){A({showEmissionFactor:!1}),e.innerHTML=`
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
        ${F.map(s=>`<option value="${s}">${s}</option>`).join("")}
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
  `;const[t,a,i]=await Promise.all([g.pareto().catch(()=>[]),g.centroids().catch(()=>({})),g.constraints().catch(()=>({}))]);t.length?$e(t):document.getElementById("pareto-chart").innerHTML='<div class="alert alert-info">No Pareto front data found.</div>',Ee(a),U(F[0]),document.getElementById("hist-cluster").addEventListener("change",s=>U(s.target.value)),document.getElementById("btn-show-sim").addEventListener("click",()=>{document.getElementById("sim-panel").style.display="block",document.getElementById("btn-show-sim").style.display="none",_e(a,i)}),document.getElementById("btn-export").addEventListener("click",()=>we(a))}function $e(e){const t=[];for(const[a,i]of Object.entries(K)){const s=e.filter(n=>n.cluster_name===a);s.length&&t.push({type:"scatter3d",mode:"markers",x:s.map(n=>n.Dissolution_Rate||0),y:s.map(n=>n.Hardness||0),z:s.map(n=>n.total_CO2e_kg||n.total_energy_kWh||0),marker:{size:5,color:i,opacity:.8},name:a,hovertext:s.map(n=>`Cluster: ${a}<br>Hardness: ${(n.Hardness||0).toFixed(2)}<br>Dissolution: ${(n.Dissolution_Rate||0).toFixed(2)}<br>Friability: ${(n.Friability||0).toFixed(3)}<br>CO₂e: ${(n.total_CO2e_kg||0).toFixed(2)}`),hoverinfo:"text"})}E("pareto-chart",t,{scene:{xaxis:{title:"Dissolution Rate"},yaxis:{title:"Hardness"},zaxis:{title:"CO₂e (kg)"},bgcolor:"#FAFAFA"},height:550,margin:{l:0,r:0,t:30,b:0},legend:{orientation:"h",y:-.05,font:{size:12}}})}async function Ee(e){const t=document.getElementById("cluster-cards"),a=[];for(const i of F){const s=K[i]||v.blue,n=e[i]||{};let r="";try{const l=await g.signature(i);r=`<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">v${l.version} — ${l.source} — Active since ${(l.created_at||"").slice(0,19)}</div>`}catch{r='<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">Signature info unavailable</div>'}const o=Object.entries(n).map(([l,d])=>`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td></tr>`).join("");a.push(`
      <div class="card">
        <h3><span class="dot" style="background:${s}"></span>${i}</h3>
        ${r}
        <table class="data-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${o}</tbody></table>
      </div>
    `)}t.innerHTML=a.join("")}async function U(e){const t=document.getElementById("version-timeline");try{const a=await g.signatureHistory(e);if(!a||!a.length){t.innerHTML='<div class="alert alert-info">No history available.</div>';return}t.innerHTML=a.map(i=>{const s=i.version||"?",n=i.source||"unknown",r=(i.created_at||"").slice(0,19),o=i.trigger_batch_id,l=i.is_active?'<span class="badge badge-pass" style="margin-left:8px">ACTIVE</span>':"";return`
        <div class="timeline-entry">
          <span class="version-badge">v${s}</span>
          <strong style="margin-left:8px">${n.toUpperCase()}</strong>${l}<br/>
          <span style="color:var(--text-muted)">${r}</span>
          ${o?`<br/><span style="color:var(--accent-green)">Triggered by batch: <strong>${o}</strong></span>`:""}
        </div>
      `}).join("")}catch(a){t.innerHTML=`<div class="alert alert-warn">Could not load history: ${a.message}</div>`}}async function _e(e,t){const a=document.getElementById("sim-sliders"),i=t.CPP_COLS||[];let s;try{s=await g.masterStats()}catch{return}const n=e[m.cluster]||{};a.innerHTML=i.map(r=>{const o=s.cpp_ranges?.[r]||{min:0,max:100,mean:50},l=n[r]??o.mean,d=Math.max(o.min,Math.min(o.max,l)),c=((o.max-o.min)/50).toFixed(4);return`
      <div class="form-group">
        <label>${r.replace(/_/g," ")}</label>
        <input type="range" id="sim-${r}" min="${o.min}" max="${o.max}" step="${c}" value="${d}" />
        <div class="range-value" id="srv-${r}">${d.toFixed(2)}</div>
      </div>
    `}).join(""),i.forEach(r=>{const o=document.getElementById(`sim-${r}`),l=document.getElementById(`srv-${r}`);o.addEventListener("input",()=>{l.textContent=parseFloat(o.value).toFixed(2)})}),document.getElementById("btn-sim").addEventListener("click",()=>{document.getElementById("sim-result").innerHTML='<div class="alert alert-info">Dominance check requires the backend signature-manager endpoint. Use the API directly for full simulation.</div>'})}async function we(e){const t={clusters:{},export_info:"CB-MOPA Golden Signature Export"};for(const n of F)try{const r=await g.signature(n);t.clusters[n]={cpp_params:e[n]||{},version:r.version,source:r.source,created_at:r.created_at}}catch{t.clusters[n]={cpp_params:e[n]||{}}}const a=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),i=URL.createObjectURL(a),s=document.createElement("a");s.href=i,s.download="golden_signatures_export.json",s.click(),URL.revokeObjectURL(i)}async function J(e){A({showEmissionFactor:!0,onChange:()=>J(e)});let t,a,i,s;try{[t,a,i]=await Promise.all([g.masterStats(),g.constraints(),g.carbonTargets().catch(()=>null)])}catch(h){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${h.message}</div>`;return}const n=t.batch_data?.[m.batchId]||t.batch_data?.[t.batch_ids[0]]||{},r=n.total_CO2e_kg||67,l=(a.CARBON_CONFIG||{}).regulatory_limit_kg||85,d=i?.current_target_kg||50,c=t.batch_ids.map(h=>t.batch_data?.[h]?.total_CO2e_kg||0).filter(h=>h>0),u=i?.recent_co2e_values||c.slice(-20),b=c.length>=5?c.slice(-5).reduce((h,x)=>h+x,0)/5:r,p=c.length>=2?c[c.length-2]:r,T=r/l*100;if(e.innerHTML=`
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-value">${r.toFixed(2)} kg</div>
        <p class="metric-label">Current Batch CO₂e</p>
        <div class="metric-delta ${r<p?"positive":"negative"}">${r-p>0?"+":""}${(r-p).toFixed(2)} kg vs prev</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${b.toFixed(2)} kg</div>
        <p class="metric-label">5-Batch Rolling Average</p>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:${T<=100?"var(--accent-green)":"var(--accent-red)"}">${T.toFixed(1)}%</div>
        <p class="metric-label">% vs Regulatory Target</p>
        <div class="metric-delta neutral">Target: ${l} kg</div>
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
  `,E("gauge-chart",[{type:"indicator",mode:"gauge+number+delta",value:r,delta:{reference:d},gauge:{axis:{range:[0,l*1.5]},bar:{color:v.blue},steps:[{range:[0,d*.9],color:"rgba(39,174,96,0.3)"},{range:[d*.9,d],color:"rgba(243,156,18,0.3)"},{range:[d,l],color:"rgba(231,76,60,0.3)"}],threshold:{line:{color:v.red,width:4},thickness:.75,value:l}},number:{suffix:" kg",font:{size:28}},title:{text:"Batch CO₂e",font:{size:14}}}],{height:320,margin:{l:30,r:30,t:60,b:20}}),u.length){const h=u.map((_,k)=>`B${k+1}`),x=u.map(_=>_<=d?v.green:_<=l?v.amber:v.red);E("trend-chart",[{x:h,y:u,type:"bar",marker:{color:x},name:"CO₂e"},{x:h,y:h.map(()=>d),mode:"lines",line:{color:v.green,dash:"dash",width:2},name:"Internal Target"},{x:h,y:h.map(()=>l),mode:"lines",line:{color:v.red,dash:"dot",width:2},name:"Regulatory Limit"}],{height:320,yaxis:{title:"CO₂e (kg)"},showlegend:!1})}try{if(s=await g.trajectory(m.batchId),s&&s.length){const h={};s.forEach($=>{h[$.Phase||"Unknown"]=(h[$.Phase||"Unknown"]||0)+($.Energy_kWh||0)});const x=Object.keys(h),_=x.map($=>h[$]),k=_.map($=>$*m.emissionFactor);E("donut-chart",[{values:k,labels:x,type:"pie",hole:.55,marker:{colors:["#27AE60","#2E86C1","#E67E22","#9B59B6","#E74C3C","#1ABC9C","#F39C12"].slice(0,x.length)},textinfo:"label+percent",textfont:{size:11}}],{title:`Phase CO₂e — Batch ${m.batchId}`,height:350,legend:{orientation:"h",y:-.1,font:{size:11}}});const X=k.reduce(($,S)=>$+S,0),Z=x.map(($,S)=>`<tr><td>${$}</td><td>${_[S].toFixed(2)} kWh</td><td>${k[S].toFixed(2)} kg</td><td>${(k[S]/X*100).toFixed(1)}%</td></tr>`).join("");document.getElementById("phase-table").innerHTML=`
        <h3 style="margin-bottom:0.5rem">Phase Breakdown</h3>
        <table class="data-table"><thead><tr><th>Phase</th><th>Energy</th><th>CO₂e</th><th>Share</th></tr></thead><tbody>${Z}</tbody></table>
      `}}catch{}const w=d;E("target-chart",[{x:[`Current
Batch`,`Internal
Target`,`Regulatory
Limit`],y:[r,w,l],type:"bar",marker:{color:[r<=w?v.green:v.red,v.blue,v.red]},text:[`${r.toFixed(1)} kg`,`${w.toFixed(1)} kg`,`${l.toFixed(1)} kg`],textposition:"outside"}],{height:280,yaxis:{title:"CO₂e (kg)"}});const B=w-r;document.getElementById("target-info").innerHTML=`
    <h3 style="margin-bottom:1rem">Impact Summary</h3>
    <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value" style="color:${B>0?"var(--accent-green)":"var(--accent-red)"}; font-size:1.3rem">${B>0?"+":""}${B.toFixed(2)} kg</div><p class="metric-label">Headroom vs Target</p></div>
    <div class="metric-card"><div class="metric-value" style="font-size:1.3rem">${(r/l*100).toFixed(1)}%</div><p class="metric-label">Regulatory Usage</p></div>
  `;const O=["Morning (6-14)","Evening (14-22)","Night (22-6)"],f=[.68,.82,.55];E("shift-chart",[{x:O,y:f,type:"bar",marker:{color:[v.amber,v.red,v.green]},text:f.map(h=>`${h.toFixed(2)} kg/kWh`),textposition:"outside"}],{height:260,yaxis:{title:"kg CO₂/kWh"},title:"Grid Emission Factor by Shift"}),Be(n,a)}function Be(e,t){const a=t.PHARMA_LIMITS||{},i=t.CQA_COLS||[],s=t.CARBON_CONFIG?.regulatory_limit_kg||85,n=[];i.forEach(l=>{const d=e[l]??0,c=a[l]||{};let u=!0,b="";c.min!==void 0&&c.max!==void 0?(u=d>=c.min&&d<=c.max,b=`[${c.min}, ${c.max}]`):c.min!==void 0?(u=d>=c.min,b=`≥ ${c.min}`):c.max!==void 0&&(u=d<=c.max,b=`≤ ${c.max}`),n.push(`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td><td>${b}</td><td><span class="badge ${u?"badge-pass":"badge-fail"}">${u?"PASS":"FAIL"}</span></td></tr>`)});const r=e.total_CO2e_kg||0,o=r<=s;n.push(`<tr><td>Total CO₂e</td><td>${r.toFixed(2)} kg</td><td>≤ ${s} kg</td><td><span class="badge ${o?"badge-pass":"badge-fail"}">${o?"PASS":"FAIL"}</span></td></tr>`),document.getElementById("compliance-table").innerHTML=`
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${n.join("")}</tbody>
    </table>
  `}P("/",re);P("/dashboard",oe);P("/live-batch",de);P("/recommendations",Y);P("/signatures",Ce);P("/carbon",J);ae();se();
