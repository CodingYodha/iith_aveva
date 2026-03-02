(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function a(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=a(n);fetch(n.href,s)}})();const ee="/api";async function y(e,t,a=null){const i={method:e,headers:{"Content-Type":"application/json"}};a&&(i.body=JSON.stringify(a));const n=await fetch(`${ee}/${t}`,i);if(!n.ok){const s=await n.json().catch(()=>({detail:n.statusText}));throw new Error(s.detail||n.statusText)}return n.json()}const p={get:e=>y("GET",e),post:(e,t)=>y("POST",e,t),health:()=>fetch("/health").then(e=>e.json()).catch(()=>null),centroids:()=>y("GET","data/centroids"),envelopes:()=>y("GET","data/envelopes"),pareto:()=>y("GET","data/pareto"),masterStats:()=>y("GET","data/master-stats"),trajectory:e=>y("GET",`data/trajectory/${e}`),clusterBatchMap:()=>y("GET","data/cluster-batch-map"),constraints:()=>y("GET","data/constraints"),driftCheck:e=>y("POST","batch/drift-check",e),recommendations:(e,t)=>y("GET",`recommendations/${e}/${t}`),logDecision:e=>y("POST","decisions/",e),decisionHistory:(e=50)=>y("GET",`decisions/history?limit=${e}`),signature:e=>y("GET",`signatures/${e}`),signatureHistory:e=>y("GET",`signatures/${e}/history`),carbonTargets:()=>y("GET","carbon/targets"),preferenceSummary:()=>y("GET","preferences/summary")},te=[{path:"/",label:"Home"},{path:"/dashboard",label:"Dashboard"},{path:"/live-batch",label:"Live Batch"},{path:"/recommendations",label:"Recommendations"},{path:"/signatures",label:"Golden Signatures"},{path:"/carbon",label:"Carbon Targets"}];function ae(){const e=document.getElementById("navbar"),t=te.map(a=>`<a href="#${a.path}">${a.label}</a>`).join("");e.innerHTML=`
    <div class="nav-brand">CB-MOPA</div>
    <div class="nav-links">${t}</div>
    <div class="nav-status" id="nav-health">
      <span class="status-dot" id="health-dot"></span>
      <span id="health-text">Checking...</span>
    </div>
  `,N(),setInterval(N,15e3)}async function N(){const e=document.getElementById("health-dot"),t=document.getElementById("health-text");if(!(!e||!t))try{const a=await p.health();a&&a.status==="ok"?(e.className="status-dot ok",t.textContent="API Connected"):(e.className="status-dot fail",t.textContent="API Error")}catch{e.className="status-dot fail",t.textContent="API Offline"}}const A={};let T=null;function P(e,t){A[e]=t}function ie(){return window.location.hash.slice(1)||"/"}async function z(){const e=ie(),t=A[e]||A["/"];if(!t)return;T&&typeof T=="function"&&(T(),T=null),document.querySelectorAll(".nav-links a").forEach(i=>{i.classList.toggle("active",i.getAttribute("href")===`#${e}`)});const a=document.getElementById("main-content");a.innerHTML='<div class="spinner"></div>';try{T=await t(a)}catch(i){a.innerHTML=`<div class="alert alert-crit">Page error: ${i.message}</div>`,console.error(i)}}function ne(){window.addEventListener("hashchange",z),z()}const q=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"],m={cluster:q[2],batchId:"T001",emissionFactor:.72};function se(){document.getElementById("sidebar").classList.remove("hidden")}function V(){document.getElementById("sidebar").classList.add("hidden")}function M(e={}){se();const t=document.getElementById("sidebar"),a=e.showEmissionFactor!==!1;if(t.innerHTML=`
    <h3>Controls</h3>

    <label for="sb-cluster">Golden Cluster</label>
    <select id="sb-cluster">
      ${q.map(i=>`<option value="${i}" ${i===m.cluster?"selected":""}>${i}</option>`).join("")}
    </select>

    <label for="sb-batch">Batch ID</label>
    <input type="text" id="sb-batch" value="${m.batchId}" />

    ${a?`
      <label for="sb-ef">Emission Factor (kg CO₂/kWh)</label>
      <input type="range" class="sidebar-range" id="sb-ef"
             min="0.3" max="1.2" step="0.01" value="${m.emissionFactor}" />
      <div class="sidebar-range-value" id="sb-ef-val">${m.emissionFactor.toFixed(2)}</div>
    `:""}
  `,t.querySelector("#sb-cluster").addEventListener("change",i=>{m.cluster=i.target.value,e.onChange&&e.onChange()}),t.querySelector("#sb-batch").addEventListener("change",i=>{m.batchId=i.target.value.trim()||"T001",e.onChange&&e.onChange()}),a){const i=t.querySelector("#sb-ef"),n=t.querySelector("#sb-ef-val");i.addEventListener("input",s=>{m.emissionFactor=parseFloat(s.target.value),n.textContent=m.emissionFactor.toFixed(2)}),i.addEventListener("change",()=>{e.onChange&&e.onChange()})}}function re(e){V(),e.innerHTML=`
    <div class="landing-hero">
      <h1>CB-MOPA</h1>
      <p class="subtitle">
        Causal-Bayesian Multi-Objective Process Analytics for pharmaceutical
        tablet manufacturing. Real-time optimization through causal inference,
        golden batch signatures, and adaptive operator preference learning.
      </p>

      <div class="landing-features">
        <div class="card">
          <h3>Module 1: Probabilistic DTW Envelope</h3>
          <p>Real-time temporal drift detection against golden batch signatures.
          DBA builds ±3σ probabilistic corridors for each phase × sensor
          combination. Soft-DTW distance quantifies deviation severity.</p>
        </div>
        <div class="card">
          <h3>Module 2: Causal Counterfactual Engine</h3>
          <p>DoWhy Do-calculus interventions that prove causal safety before
          acting. Structural Causal Models estimate treatment effects and
          generate dual-pathway recommendations (Yield Guard / Carbon Savior).</p>
        </div>
        <div class="card">
          <h3>Module 3: Bayesian HITL Preference</h3>
          <p>BoTorch PairwiseGP learns the operator's latent utility function
          from pairwise A/B choices. Recommendations adapt to each shift
          supervisor's operational style over time.</p>
        </div>
      </div>

      <a href="#/dashboard" class="btn btn-primary landing-cta">Enter Dashboard</a>
    </div>
  `}async function oe(e){V(),e.innerHTML=`
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
  `;try{const t=await p.health(),a=document.getElementById("status-cards");if(!a)return;const i=t&&t.status==="ok",n=t&&t.db_connected;a.children[0].innerHTML=`<div class="metric-value" style="color:${i?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">API Backend</p>`,a.children[1].innerHTML=`<div class="metric-value" style="color:${n?"var(--accent-green)":"var(--accent-red)"}">●</div><p class="metric-label">Database</p>`}catch{}}const ce={paper_bgcolor:"#0D1117",plot_bgcolor:"#0D1117",font:{family:"Inter, sans-serif",color:"#E6EDF3",size:12},margin:{l:60,r:20,t:40,b:50}},le={displayModeBar:!1,responsive:!0},g={blue:"#2E86C1",green:"#27AE60",orange:"#E67E22",red:"#E74C3C",amber:"#F39C12",muted:"#8B949E"},K={"Max Quality Golden":g.green,"Deep Decarbonization Golden":g.blue,"Balanced Operational Golden":g.orange};function _(e,t,a={},i={}){const n=document.getElementById(e);if(!n)return;const s={...ce,...a},r={...le,...i};Plotly.newPlot(n,t,s,r)}let H=null,I=null,R=null,$=null;async function de(e){M({showEmissionFactor:!0}),e.innerHTML=`
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
  `;try{[H,I,R,$]=await Promise.all([H||p.masterStats(),I||p.centroids(),R||p.envelopes(),$||p.constraints()])}catch(t){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${t.message}</div>`;return}me(),he(),ge(),D(),ve(),pe(),document.getElementById("btn-drift").addEventListener("click",ue),document.getElementById("env-phase").addEventListener("change",()=>{Q(),D()}),document.getElementById("env-sensor").addEventListener("change",D)}function me(){const e=document.getElementById("batch-caption");e&&(e.textContent=`Cluster: ${m.cluster} | Batch: ${m.batchId} | EF: ${m.emissionFactor} kg CO₂/kWh`)}function j(){const e={};return $.CPP_COLS.forEach(t=>{const a=document.getElementById(`cpp-${t}`);e[t]=a?parseFloat(a.value):0}),e}function he(){const e=document.getElementById("cpp-sliders"),t=I[m.cluster]||{},a=H.cpp_ranges;e.innerHTML=$.CPP_COLS.map(i=>{const n=a[i]||{min:0,max:100,mean:50},s=t[i]!==void 0?t[i]:n.mean,r=Math.max(n.min,Math.min(n.max,s)),o=((n.max-n.min)/100).toFixed(4);return`
      <div class="form-group">
        <label>${i.replace(/_/g," ")}</label>
        <input type="range" id="cpp-${i}" min="${n.min}" max="${n.max}" step="${o}" value="${r}" />
        <div class="range-value" id="rv-${i}">${r.toFixed(2)}</div>
      </div>
    `}).join(""),$.CPP_COLS.forEach(i=>{const n=document.getElementById(`cpp-${i}`),s=document.getElementById(`rv-${i}`);n.addEventListener("input",()=>{s.textContent=parseFloat(n.value).toFixed(2)})})}async function ue(){const e=document.getElementById("btn-drift"),t=document.getElementById("drift-result");e.disabled=!0,e.textContent="Running drift detection...";try{const a=await p.driftCheck({batch_id:m.batchId,cpp_params:j(),cluster_name:m.cluster}),i=a.overall_alarm||"UNKNOWN";let n="alert-info",s=i;i==="OK"?(n="alert-ok",s="OK — Batch within golden envelope"):i==="WARNING"?(n="alert-warn",s="WARNING — Partial drift detected"):(n="alert-crit",s="CRITICAL — Significant deviation");let r="";a.drift_details&&a.drift_details.length&&(r=`
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
      `),t.innerHTML=`<div class="alert ${n}">OVERALL: ${s}</div>${r}`}catch(a){t.innerHTML=`<div class="alert alert-crit">Drift check failed: ${a.message}</div>`}finally{e.disabled=!1,e.textContent="Check Drift"}}function ge(){const e=document.getElementById("env-phase"),t=Object.keys($.PHASE_SENSOR_MAP);e.innerHTML=t.map(a=>`<option value="${a}">${a}</option>`).join(""),Q()}function Q(){const e=document.getElementById("env-phase").value,t=document.getElementById("env-sensor"),a=$.PHASE_SENSOR_MAP[e]||[];t.innerHTML=a.map(i=>`<option value="${i}">${i}</option>`).join("")}function D(){const e=document.getElementById("env-phase")?.value,t=document.getElementById("env-sensor")?.value;if(!e||!t)return;const a=R?.[m.cluster]?.[e]?.[t];if(!a){document.getElementById("envelope-chart").innerHTML='<div class="alert alert-info">No envelope data for this selection</div>';return}const i=a.mean,n=a.upper,s=a.lower,r=Array.from({length:i.length},(f,h)=>h),o=j(),l=I[m.cluster]||{};let d=0;$.CPP_COLS.forEach(f=>{const h=o[f]||0,x=l[f]||.01;d+=Math.abs(h-x)/Math.max(Math.abs(x),.01)*100}),d/=$.CPP_COLS.length;const c=Math.sqrt(i.reduce((f,h)=>f+Math.pow(h-i.reduce((x,E)=>x+E,0)/i.length,2),0)/i.length)||1,u=Math.max(.02,d/100)*c;let b=m.batchId.split("").reduce((f,h)=>f+h.charCodeAt(0),0);const v=()=>(b=(b*16807+0)%2147483647,(b/2147483647-.5)*2),L=i.map(f=>f+v()*u),k=[{x:[...r,...r.slice().reverse()],y:[...n,...s.slice().reverse()],fill:"toself",fillcolor:"rgba(46,134,193,0.15)",line:{color:"rgba(0,0,0,0)"},name:"±3σ Envelope",hoverinfo:"skip"},{x:r,y:i,mode:"lines",line:{color:g.blue,width:2,dash:"dot"},name:"Golden Mean (DBA)"},{x:r,y:n,mode:"lines",line:{color:g.blue,width:1,dash:"dash"},name:"Upper +3σ",opacity:.6},{x:r,y:s,mode:"lines",line:{color:g.blue,width:1,dash:"dash"},name:"Lower -3σ",opacity:.6},{x:r,y:L,mode:"lines",line:{color:g.orange,width:2.5},name:`Batch ${m.batchId}`}],w=[],O=[];L.forEach((f,h)=>{(f<s[h]||f>n[h])&&(w.push(h),O.push(f))}),w.length&&k.push({x:w,y:O,mode:"markers",marker:{color:g.red,size:8,symbol:"x"},name:"Outside Envelope"}),_("envelope-chart",k,{title:`Batch ${m.batchId} vs ${m.cluster} — ${e} / ${t}`,xaxis:{title:"Time Step"},yaxis:{title:t.replace(/_/g," ")},height:420,legend:{orientation:"h",y:-.18}})}function ve(){const e=j(),t=I[m.cluster]||{},a=$.CPP_COLS.map(c=>c.replace(/_/g," ")),i=$.CPP_COLS.map(c=>e[c]||0),n=$.CPP_COLS.map(c=>t[c]||0),s=Math.max(...i,...n,1),r=i.map(c=>c/s),o=n.map(c=>c/s);_("radar-chart",[{type:"scatterpolar",r:[...o,o[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(46,134,193,0.2)",line:{color:g.blue,width:2},name:"Golden Centroid"},{type:"scatterpolar",r:[...r,r[0]],theta:[...a,a[0]],fill:"toself",fillcolor:"rgba(230,126,34,0.2)",line:{color:g.orange,width:2},name:"Current Batch"}],{polar:{bgcolor:"#0D1117",radialaxis:{visible:!0,range:[0,1.1],gridcolor:"#30363d"},angularaxis:{gridcolor:"#30363d"}},height:400,showlegend:!0,legend:{orientation:"h",y:-.1}});const l=document.getElementById("cpp-table-container"),d=$.CPP_COLS.map(c=>{const u=(e[c]||0).toFixed(2),b=(t[c]||0).toFixed(2),v=t[c]?((e[c]-t[c])/t[c]*100).toFixed(1):"0.0";return`<tr><td>${c.replace(/_/g," ")}</td><td>${u}</td><td>${b}</td><td>${v}%</td></tr>`}).join("");l.innerHTML=`
    <h3 style="margin-bottom:0.5rem">CPP Comparison</h3>
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Current</th><th>Golden</th><th>Dev %</th></tr></thead>
      <tbody>${d}</tbody>
    </table>
  `}async function pe(){try{const e=await p.trajectory(m.batchId);if(!e||!e.length){document.getElementById("energy-chart").innerHTML='<div class="alert alert-info">No trajectory data for this batch</div>';return}const t={};e.forEach(l=>{const d=l.Phase||"Unknown";t[d]=(t[d]||0)+(l.Energy_kWh||0)});const a=Object.keys(t).sort((l,d)=>t[l]-t[d]),i=a.map(l=>t[l]);_("energy-chart",[{y:a,x:i,type:"bar",orientation:"h",marker:{color:i,colorscale:"Viridis"},text:i.map(l=>`${l.toFixed(2)} kWh`),textposition:"outside",name:`Batch ${m.batchId}`}],{title:`Energy Consumption by Phase — Batch ${m.batchId}`,xaxis:{title:"Energy (kWh)"},yaxis:{title:"Phase"},height:350,margin:{l:120,r:60,t:50,b:40}});const n=e.reduce((l,d)=>l+(d.Energy_kWh||0),0),s=n*m.emissionFactor,o=50-s;document.getElementById("co2-metrics").innerHTML=`
      <div class="metric-card"><div class="metric-value">${n.toFixed(2)}</div><p class="metric-label">Total Energy (kWh)</p></div>
      <div class="metric-card"><div class="metric-value">${s.toFixed(2)}</div><p class="metric-label">CO₂e (kg)</p></div>
      <div class="metric-card"><div class="metric-value" style="color:${o>0?"var(--accent-green)":"var(--accent-red)"}">${o>0?"+":""}${o.toFixed(2)}</div><p class="metric-label">Target Headroom (kg)</p></div>
    `}catch{document.getElementById("energy-chart").innerHTML=`<div class="alert alert-info">No trajectory data for batch ${m.batchId}</div>`}}const be={pathway_name:"Yield Guard",param_changes:[{param:"Drying_Temp",old_value:60,new_value:54,delta_pct:-10}],expected_cqa_delta:{Hardness:.08,Friability:-.1,Dissolution_Rate:.03,Disintegration_Time:-1.08,Content_Uniformity:.02,total_CO2e_kg:-.14},expected_co2_change:-.14,safety_check:"PASS",causal_confidence:.82,preference_utility:.42},ye={pathway_name:"Carbon Savior",param_changes:[{param:"Machine_Speed",old_value:150,new_value:135,delta_pct:-10}],expected_cqa_delta:{Hardness:.02,Friability:-.03,Dissolution_Rate:.01,Disintegration_Time:-.5,Content_Uniformity:-.08,total_CO2e_kg:-.25},expected_co2_change:-.25,safety_check:"PASS",causal_confidence:.78,preference_utility:-.69};async function Y(e){M({showEmissionFactor:!1,onChange:()=>Y(e)});let t={},a={};try{const d=await p.masterStats();t=d.batch_data?.[m.batchId]||d.batch_data?.[d.batch_ids[0]]||{},a=await p.constraints()}catch{}const i=a.CQA_COLS||["Hardness","Friability","Dissolution_Rate","Disintegration_Time","Content_Uniformity","Tablet_Weight"],n=a.PHARMA_LIMITS||{},s=i.map(d=>{const c=t[d]??0,u=n[d]||{};let b=!0,v="";return u.min!==void 0&&u.max!==void 0?(b=c>=u.min&&c<=u.max,v=`[${u.min}, ${u.max}]`):u.min!==void 0?(b=c>=u.min,v=`≥ ${u.min}`):u.max!==void 0&&(b=c<=u.max,v=`≤ ${u.max}`),`<div class="metric-card">
      <div class="metric-value" style="font-size:1.4rem;color:${b?"var(--accent-green)":"var(--accent-red)"}">${c.toFixed(2)}</div>
      <p class="metric-label">${d.replace(/_/g," ")}</p>
      <div class="metric-delta neutral">Target: ${v}</div>
    </div>`}).join("");let r=null,o=null,l=!1;try{const d=await p.recommendations(m.batchId,m.cluster);r=d.pathway_a,o=d.pathway_b}catch{}r||(l=!0,r=be,o=ye),e.innerHTML=`
    <div class="page-header">
      <h1>Causal Recommendation Engine</h1>
      <p>Do-calculus structural causal models estimate the causal effect of each process parameter change.
      The BoTorch PairwiseGP re-ranks recommendations by your historical preferences.</p>
    </div>

    <h2 class="section-title">Current Batch: ${m.batchId}</h2>
    <div class="grid-3" style="margin-bottom:1.5rem">${s}</div>

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
  `,W("card-a",r,"impact-a"),o&&W("card-b",o,"impact-b"),document.getElementById("btn-exec-a").addEventListener("click",()=>G(r,o,"A")),document.getElementById("btn-exec-b").addEventListener("click",()=>G(r,o,"B")),document.getElementById("btn-modify").addEventListener("click",()=>fe(r,o,a.CPP_COLS||[])),xe()}function W(e,t,a){const i=document.getElementById(e),n=t.param_changes||[],s=t.expected_cqa_delta||{},r=t.safety_check||"UNKNOWN",o=t.causal_confidence||.8,l=t.preference_utility??0,d=n.map(v=>`<tr><td>${v.param}</td><td>${v.old_value}</td><td>${v.new_value}</td><td>${v.delta_pct>0?"+":""}${v.delta_pct.toFixed(1)}%</td></tr>`).join("");i.innerHTML=`
    <h3>${t.pathway_name}</h3>
    <div class="subtitle">GP Utility Score: ${l.toFixed(3)}</div>
    ${n.length?`<table class="data-table" style="margin-bottom:1rem">
      <thead><tr><th>Param</th><th>Old</th><th>New</th><th>Change</th></tr></thead>
      <tbody>${d}</tbody>
    </table>`:""}
    <div id="${a}" style="height:200px;margin-bottom:1rem"></div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${t.expected_co2_change>0?"+":""}${t.expected_co2_change.toFixed(4)} kg</div><p class="metric-label">CO₂e Change</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem">${(o*100).toFixed(0)}%</div><p class="metric-label">Confidence</p></div>
      <div class="metric-card" style="flex:1;min-width:80px"><div class="metric-value" style="font-size:1.1rem;color:${r==="PASS"?"var(--accent-green)":"var(--accent-red)"}">${r}</div><p class="metric-label">Safety</p></div>
    </div>
  `;const c=Object.keys(s),u=Object.values(s),b=u.map(v=>v>0?g.green:v<0?g.red:g.muted);_(a,[{x:u,y:c.map(v=>v.replace(/_/g," ")),type:"bar",orientation:"h",marker:{color:b},text:u.map(v=>`${v>0?"+":""}${v.toFixed(4)}`),textposition:"outside"}],{title:"Expected CQA Impact",height:200,margin:{l:120,r:60,t:35,b:20},xaxis:{title:"Delta"},font:{size:11}})}async function G(e,t,a,i=null,n=""){const s=document.getElementById("decision-result");try{const r=await p.logDecision({batch_id:m.batchId,pathway_a:e,pathway_b:t,chosen:a,modified_params:i,reason:n,target_config:m.cluster});if(r){const o=r.total_comparisons||0;s.innerHTML=`<div class="alert alert-ok">Decision logged. ${r.preference_model_updated?"Preference model updated.":"Recorded."} (${o}/3 comparisons)</div>`}}catch(r){s.innerHTML=`<div class="alert alert-crit">Failed: ${r.message}</div>`}}function fe(e,t,a){const i=document.getElementById("modify-form");i.style.display="block",i.innerHTML=`
    <h3 style="margin-bottom:1rem">Custom Parameter Adjustments</h3>
    <div class="form-grid">${a.map(n=>`<div class="form-group">
        <label>${n.replace(/_/g," ")} Δ%</label>
        <input type="number" id="mod-${n}" value="0" min="-20" max="20" step="1"
               style="width:100%;padding:6px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
      </div>`).join("")}</div>
    <div class="form-group" style="margin-bottom:1rem">
      <label>Reason</label>
      <input type="text" id="mod-reason" placeholder="Reason for modification"
             style="width:100%;padding:8px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary)" />
    </div>
    <button class="btn btn-primary" id="btn-submit-mod">Submit Modified Decision</button>
  `,document.getElementById("btn-submit-mod").addEventListener("click",()=>{const n={};a.forEach(r=>{const o=parseFloat(document.getElementById(`mod-${r}`).value)||0;o!==0&&(n[r]=o)});const s=document.getElementById("mod-reason").value;G(e,t,"MODIFIED",n,s),i.style.display="none"})}async function xe(){try{const e=await p.preferenceSummary();if(!e)return;const t=e.quality_preferred_count||0,a=e.carbon_preferred_count||0;_("pref-chart",[{x:[`Yield Guard
(Quality)`],y:[t],type:"bar",marker:{color:g.green},text:[String(t)],textposition:"outside",name:"Quality"},{x:[`Carbon Savior
(Decarb)`],y:[a],type:"bar",marker:{color:g.blue},text:[String(a)],textposition:"outside",name:"Carbon"}],{title:"Pathway Preference Distribution",yaxis:{title:"Times Chosen"},height:300,showlegend:!1});const i=e.status==="active"?'<span class="badge badge-pass">PairwiseGP Active</span>':'<span class="badge badge-warn">Cold Start</span>';document.getElementById("pref-stats").innerHTML=`
      <h3 style="margin-bottom:1rem">Model Status</h3>
      <div style="margin-bottom:1rem">${i}</div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.total_decisions}</div><p class="metric-label">Total Decisions</p></div>
      <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value">${e.comparisons_count}</div><p class="metric-label">Comparisons</p></div>
      <div class="metric-card"><div class="metric-value">${(e.quality_preference_pct||0).toFixed(0)}%</div><p class="metric-label">Quality Preference</p></div>
    `}catch{}try{const e=await p.decisionHistory(10);if(e&&e.length){const t=e.map(a=>`<tr><td>${a.batch_id||""}</td><td>${a.chosen_pathway||""}</td><td>${a.target_config||""}</td><td>${(a.timestamp||"").slice(0,19)}</td></tr>`).join("");document.getElementById("decision-history").innerHTML=`
        <h3 style="margin:1rem 0 0.5rem">Recent Decision Log</h3>
        <table class="data-table"><thead><tr><th>Batch</th><th>Chosen</th><th>Config</th><th>Time</th></tr></thead><tbody>${t}</tbody></table>
      `}}catch{}}const F=["Max Quality Golden","Deep Decarbonization Golden","Balanced Operational Golden"];async function $e(e){M({showEmissionFactor:!1}),e.innerHTML=`
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
        ${F.map(n=>`<option value="${n}">${n}</option>`).join("")}
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
  `;const[t,a,i]=await Promise.all([p.pareto().catch(()=>[]),p.centroids().catch(()=>({})),p.constraints().catch(()=>({}))]);t.length?Ce(t):document.getElementById("pareto-chart").innerHTML='<div class="alert alert-info">No Pareto front data found.</div>',_e(a),U(F[0]),document.getElementById("hist-cluster").addEventListener("change",n=>U(n.target.value)),document.getElementById("btn-show-sim").addEventListener("click",()=>{document.getElementById("sim-panel").style.display="block",document.getElementById("btn-show-sim").style.display="none",Ee(a,i)}),document.getElementById("btn-export").addEventListener("click",()=>ke(a))}function Ce(e){const t=[];for(const[a,i]of Object.entries(K)){const n=e.filter(s=>s.cluster_name===a);n.length&&t.push({type:"scatter3d",mode:"markers",x:n.map(s=>s.Dissolution_Rate||0),y:n.map(s=>s.Hardness||0),z:n.map(s=>s.total_CO2e_kg||s.total_energy_kWh||0),marker:{size:5,color:i,opacity:.8},name:a,hovertext:n.map(s=>`Cluster: ${a}<br>Hardness: ${(s.Hardness||0).toFixed(2)}<br>Dissolution: ${(s.Dissolution_Rate||0).toFixed(2)}<br>Friability: ${(s.Friability||0).toFixed(3)}<br>CO₂e: ${(s.total_CO2e_kg||0).toFixed(2)}`),hoverinfo:"text"})}_("pareto-chart",t,{scene:{xaxis:{title:"Dissolution Rate"},yaxis:{title:"Hardness"},zaxis:{title:"CO₂e (kg)"},bgcolor:"#0D1117"},height:550,margin:{l:0,r:0,t:30,b:0},legend:{orientation:"h",y:-.05,font:{size:12}}})}async function _e(e){const t=document.getElementById("cluster-cards"),a=[];for(const i of F){const n=K[i]||g.blue,s=e[i]||{};let r="";try{const l=await p.signature(i);r=`<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">v${l.version} — ${l.source} — Active since ${(l.created_at||"").slice(0,19)}</div>`}catch{r='<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">Signature info unavailable</div>'}const o=Object.entries(s).map(([l,d])=>`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td></tr>`).join("");a.push(`
      <div class="card">
        <h3><span class="dot" style="background:${n}"></span>${i}</h3>
        ${r}
        <table class="data-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${o}</tbody></table>
      </div>
    `)}t.innerHTML=a.join("")}async function U(e){const t=document.getElementById("version-timeline");try{const a=await p.signatureHistory(e);if(!a||!a.length){t.innerHTML='<div class="alert alert-info">No history available.</div>';return}t.innerHTML=a.map(i=>{const n=i.version||"?",s=i.source||"unknown",r=(i.created_at||"").slice(0,19),o=i.trigger_batch_id,l=i.is_active?'<span class="badge badge-pass" style="margin-left:8px">ACTIVE</span>':"";return`
        <div class="timeline-entry">
          <span class="version-badge">v${n}</span>
          <strong style="margin-left:8px">${s.toUpperCase()}</strong>${l}<br/>
          <span style="color:var(--text-muted)">${r}</span>
          ${o?`<br/><span style="color:var(--accent-green)">Triggered by batch: <strong>${o}</strong></span>`:""}
        </div>
      `}).join("")}catch(a){t.innerHTML=`<div class="alert alert-warn">Could not load history: ${a.message}</div>`}}async function Ee(e,t){const a=document.getElementById("sim-sliders"),i=t.CPP_COLS||[];let n;try{n=await p.masterStats()}catch{return}const s=e[m.cluster]||{};a.innerHTML=i.map(r=>{const o=n.cpp_ranges?.[r]||{min:0,max:100,mean:50},l=s[r]??o.mean,d=Math.max(o.min,Math.min(o.max,l)),c=((o.max-o.min)/50).toFixed(4);return`
      <div class="form-group">
        <label>${r.replace(/_/g," ")}</label>
        <input type="range" id="sim-${r}" min="${o.min}" max="${o.max}" step="${c}" value="${d}" />
        <div class="range-value" id="srv-${r}">${d.toFixed(2)}</div>
      </div>
    `}).join(""),i.forEach(r=>{const o=document.getElementById(`sim-${r}`),l=document.getElementById(`srv-${r}`);o.addEventListener("input",()=>{l.textContent=parseFloat(o.value).toFixed(2)})}),document.getElementById("btn-sim").addEventListener("click",()=>{document.getElementById("sim-result").innerHTML='<div class="alert alert-info">Dominance check requires the backend signature-manager endpoint. Use the API directly for full simulation.</div>'})}async function ke(e){const t={clusters:{},export_info:"CB-MOPA Golden Signature Export"};for(const s of F)try{const r=await p.signature(s);t.clusters[s]={cpp_params:e[s]||{},version:r.version,source:r.source,created_at:r.created_at}}catch{t.clusters[s]={cpp_params:e[s]||{}}}const a=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),i=URL.createObjectURL(a),n=document.createElement("a");n.href=i,n.download="golden_signatures_export.json",n.click(),URL.revokeObjectURL(i)}async function J(e){M({showEmissionFactor:!0,onChange:()=>J(e)});let t,a,i,n;try{[t,a,i]=await Promise.all([p.masterStats(),p.constraints(),p.carbonTargets().catch(()=>null)])}catch(h){e.innerHTML=`<div class="alert alert-crit">Failed to load data: ${h.message}</div>`;return}const s=t.batch_data?.[m.batchId]||t.batch_data?.[t.batch_ids[0]]||{},r=s.total_CO2e_kg||67,l=(a.CARBON_CONFIG||{}).regulatory_limit_kg||85,d=i?.current_target_kg||50,c=t.batch_ids.map(h=>t.batch_data?.[h]?.total_CO2e_kg||0).filter(h=>h>0),u=i?.recent_co2e_values||c.slice(-20),b=c.length>=5?c.slice(-5).reduce((h,x)=>h+x,0)/5:r,v=c.length>=2?c[c.length-2]:r,L=r/l*100;if(e.innerHTML=`
    <div class="page-header">
      <h1>Carbon & Sustainability Targets</h1>
      <p>Real-time CO₂e tracking — Phase attribution — Adaptive target setting</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="metric-card">
        <div class="metric-value">${r.toFixed(2)} kg</div>
        <p class="metric-label">Current Batch CO₂e</p>
        <div class="metric-delta ${r<v?"positive":"negative"}">${r-v>0?"+":""}${(r-v).toFixed(2)} kg vs prev</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${b.toFixed(2)} kg</div>
        <p class="metric-label">5-Batch Rolling Average</p>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color:${L<=100?"var(--accent-green)":"var(--accent-red)"}">${L.toFixed(1)}%</div>
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
  `,_("gauge-chart",[{type:"indicator",mode:"gauge+number+delta",value:r,delta:{reference:d},gauge:{axis:{range:[0,l*1.5]},bar:{color:g.blue},steps:[{range:[0,d*.9],color:"rgba(39,174,96,0.3)"},{range:[d*.9,d],color:"rgba(243,156,18,0.3)"},{range:[d,l],color:"rgba(231,76,60,0.3)"}],threshold:{line:{color:g.red,width:4},thickness:.75,value:l}},number:{suffix:" kg",font:{size:28}},title:{text:"Batch CO₂e",font:{size:14}}}],{height:320,margin:{l:30,r:30,t:60,b:20}}),u.length){const h=u.map((E,B)=>`B${B+1}`),x=u.map(E=>E<=d?g.green:E<=l?g.amber:g.red);_("trend-chart",[{x:h,y:u,type:"bar",marker:{color:x},name:"CO₂e"},{x:h,y:h.map(()=>d),mode:"lines",line:{color:g.green,dash:"dash",width:2},name:"Internal Target"},{x:h,y:h.map(()=>l),mode:"lines",line:{color:g.red,dash:"dot",width:2},name:"Regulatory Limit"}],{height:320,yaxis:{title:"CO₂e (kg)"},showlegend:!1})}try{if(n=await p.trajectory(m.batchId),n&&n.length){const h={};n.forEach(C=>{h[C.Phase||"Unknown"]=(h[C.Phase||"Unknown"]||0)+(C.Energy_kWh||0)});const x=Object.keys(h),E=x.map(C=>h[C]),B=E.map(C=>C*m.emissionFactor);_("donut-chart",[{values:B,labels:x,type:"pie",hole:.55,marker:{colors:["#27AE60","#2E86C1","#E67E22","#9B59B6","#E74C3C","#1ABC9C","#F39C12"].slice(0,x.length)},textinfo:"label+percent",textfont:{size:11}}],{title:`Phase CO₂e — Batch ${m.batchId}`,height:350,legend:{orientation:"h",y:-.1,font:{size:11}}});const X=B.reduce((C,S)=>C+S,0),Z=x.map((C,S)=>`<tr><td>${C}</td><td>${E[S].toFixed(2)} kWh</td><td>${B[S].toFixed(2)} kg</td><td>${(B[S]/X*100).toFixed(1)}%</td></tr>`).join("");document.getElementById("phase-table").innerHTML=`
        <h3 style="margin-bottom:0.5rem">Phase Breakdown</h3>
        <table class="data-table"><thead><tr><th>Phase</th><th>Energy</th><th>CO₂e</th><th>Share</th></tr></thead><tbody>${Z}</tbody></table>
      `}}catch{}const k=d;_("target-chart",[{x:[`Current
Batch`,`Internal
Target`,`Regulatory
Limit`],y:[r,k,l],type:"bar",marker:{color:[r<=k?g.green:g.red,g.blue,g.red]},text:[`${r.toFixed(1)} kg`,`${k.toFixed(1)} kg`,`${l.toFixed(1)} kg`],textposition:"outside"}],{height:280,yaxis:{title:"CO₂e (kg)"}});const w=k-r;document.getElementById("target-info").innerHTML=`
    <h3 style="margin-bottom:1rem">Impact Summary</h3>
    <div class="metric-card" style="margin-bottom:0.8rem"><div class="metric-value" style="color:${w>0?"var(--accent-green)":"var(--accent-red)"}; font-size:1.3rem">${w>0?"+":""}${w.toFixed(2)} kg</div><p class="metric-label">Headroom vs Target</p></div>
    <div class="metric-card"><div class="metric-value" style="font-size:1.3rem">${(r/l*100).toFixed(1)}%</div><p class="metric-label">Regulatory Usage</p></div>
  `;const O=["Morning (6-14)","Evening (14-22)","Night (22-6)"],f=[.68,.82,.55];_("shift-chart",[{x:O,y:f,type:"bar",marker:{color:[g.amber,g.red,g.green]},text:f.map(h=>`${h.toFixed(2)} kg/kWh`),textposition:"outside"}],{height:260,yaxis:{title:"kg CO₂/kWh"},title:"Grid Emission Factor by Shift"}),we(s,a)}function we(e,t){const a=t.PHARMA_LIMITS||{},i=t.CQA_COLS||[],n=t.CARBON_CONFIG?.regulatory_limit_kg||85,s=[];i.forEach(l=>{const d=e[l]??0,c=a[l]||{};let u=!0,b="";c.min!==void 0&&c.max!==void 0?(u=d>=c.min&&d<=c.max,b=`[${c.min}, ${c.max}]`):c.min!==void 0?(u=d>=c.min,b=`≥ ${c.min}`):c.max!==void 0&&(u=d<=c.max,b=`≤ ${c.max}`),s.push(`<tr><td>${l.replace(/_/g," ")}</td><td>${d.toFixed(2)}</td><td>${b}</td><td><span class="badge ${u?"badge-pass":"badge-fail"}">${u?"PASS":"FAIL"}</span></td></tr>`)});const r=e.total_CO2e_kg||0,o=r<=n;s.push(`<tr><td>Total CO₂e</td><td>${r.toFixed(2)} kg</td><td>≤ ${n} kg</td><td><span class="badge ${o?"badge-pass":"badge-fail"}">${o?"PASS":"FAIL"}</span></td></tr>`),document.getElementById("compliance-table").innerHTML=`
    <table class="data-table">
      <thead><tr><th>Parameter</th><th>Value</th><th>Limit</th><th>Status</th></tr></thead>
      <tbody>${s.join("")}</tbody>
    </table>
  `}P("/",re);P("/dashboard",oe);P("/live-batch",de);P("/recommendations",Y);P("/signatures",$e);P("/carbon",J);ae();ne();
