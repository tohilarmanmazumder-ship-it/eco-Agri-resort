/* ============================================================
   ECOAGRI RESORT — app.js
   Router, Farm Mentor, calculators, diagrams, interactive maps
   ============================================================ */

/* ---------------- ROUTER ---------------- */
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('nav.primary a');

function showPage(hash){
  const id = (hash || '#home').replace('#','');
  let found = false;
  pages.forEach(p=>{
    const match = p.id === 'page-'+id;
    p.classList.toggle('active', match);
    if(match) found = true;
  });
  if(!found){ document.getElementById('page-home').classList.add('active'); }
  navLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  window.scrollTo({top:0, behavior:'instant' in document.documentElement.style ? 'instant':'auto'});
  document.getElementById('primaryNav').classList.remove('open');
  document.getElementById('navToggle').classList.remove('open');
  if(id === 'knowledge') buildKnowledge();
  if(id === 'ecocycle') buildEcoCycle();
  if(id === 'explore') buildMap();
  if(id === 'impact') buildImpact();
  if(id === 'exhibition') buildExhibition();
  if(id === 'myfarm') buildMyFarmSummary();
  if(id === 'planner') { generateLayout(); buildSimulator(); }
}
window.addEventListener('hashchange', ()=>showPage(location.hash));
showPage(location.hash);

const navToggleBtn = document.getElementById('navToggle');
navToggleBtn.addEventListener('click', ()=>{
  document.getElementById('primaryNav').classList.toggle('open');
  navToggleBtn.classList.toggle('open');
});

/* ---------------- HEADER SCROLL ELEVATION ---------------- */
const siteHeader = document.querySelector('header.site');
function updateHeaderShadow(){ siteHeader.classList.toggle('scrolled', window.scrollY > 8); }
window.addEventListener('scroll', updateHeaderShadow, {passive:true});
updateHeaderShadow();

/* ---------------- HERO FEATURE STRIP ---------------- */
const stripItems = ["Smart Water Management","Hydroponics","Drip Irrigation","Organic Farming","Livestock Integration","Biogas","Renewable Energy","Resource Recovery"];
const stripInner = document.getElementById('stripInner');
if(stripInner){
  const html = stripItems.map(s=>`<div class="strip-item"><span class="ic"></span>${s}</div>`).join('');
  stripInner.innerHTML = html + html; // duplicate for seamless marquee
}

/* ---------------- LOCAL STORAGE FARM DATA ---------------- */
function getFarmData(){
  try{ return JSON.parse(localStorage.getItem('ecoagri_farm')||'{}'); }catch(e){ return {}; }
}
function saveFarmData(patch){
  const data = Object.assign(getFarmData(), patch);
  localStorage.setItem('ecoagri_farm', JSON.stringify(data));
  return data;
}
function clearFarmData(){
  localStorage.removeItem('ecoagri_farm');
  buildMyFarmSummary();
}
function buildMyFarmSummary(){
  const d = getFarmData();
  const holder = document.getElementById('myFarmSummary');
  if(!holder) return;
  const cards = [
    {t:'Location', v: d.village || d.district || d.state ? [d.village,d.district,d.state].filter(Boolean).join(', ') : 'Not entered yet'},
    {t:'Soil', v: d.soilTexture ? (d.soilTexture + (d.soilPh?(' · pH '+d.soilPh):'')) : 'Not entered yet'},
    {t:'Land area', v: d.area ? (d.area+' '+(d.areaUnit||'')) : 'Not entered yet'},
    {t:'Water source', v: d.waterSource || 'Not entered yet'},
    {t:'Livestock', v: (d.livestock && d.livestock.length) ? d.livestock.join(', ') : 'Not entered yet'},
    {t:'Main goals', v: (d.goals && d.goals.length) ? d.goals.join(', ') : 'Not entered yet'},
  ];
  holder.innerHTML = cards.map(c=>`<div class="card"><h3>${c.t}</h3><p class="small">${c.v}</p></div>`).join('');
}

/* ---------------- MENTOR STEP NAVIGATION ---------------- */
const mentorNavBtns = document.querySelectorAll('#mentorNav button');
mentorNavBtns.forEach(b=> b.addEventListener('click', ()=> goStep(b.dataset.step)));
function goStep(step){
  document.querySelectorAll('.mentor-step').forEach(s=> s.classList.toggle('active', s.dataset.panel===step));
  mentorNavBtns.forEach(b=> b.classList.toggle('active', b.dataset.step===step));
}

/* chip selectors (livestock, goals, cost) */
function setupChips(containerId, max){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(!chip.classList.contains('picked') && max){
        const pickedCount = el.querySelectorAll('.chip.picked').length;
        if(pickedCount >= max) return;
      }
      chip.classList.toggle('picked');
    });
  });
}
setupChips('fp-livestock', null);
setupChips('fp-goals', 2);
setupChips('costChips', null);

function getPicked(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' .chip.picked')).map(c=>c.dataset.val);
}

document.getElementById('s-upload')?.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  document.getElementById('s-upload-name').textContent = f ? ('Selected: '+f.name+' (stored on this device only)') : '';
});

/* ---------------- LOCATION & WEATHER (Open-Meteo, no key needed) ---------------- */
function useMyLocation(){
  const status = document.getElementById('locStatus');
  if(!navigator.geolocation){ status.textContent = 'Geolocation is not supported on this browser — please enter location manually.'; return; }
  status.textContent = 'Requesting permission…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
    document.getElementById('f-latlng').value = lat+', '+lon;
    status.textContent = 'Location captured: '+lat+', '+lon;
    fetchWeather(lat, lon);
  }, err=>{
    status.textContent = 'Location permission denied or unavailable — please enter your location manually below.';
  }, {timeout:10000});
}

function fetchWeatherManual(){
  const latlng = document.getElementById('f-latlng').value.trim();
  const errBox = document.getElementById('weatherError');
  errBox.classList.add('result-hidden');
  if(latlng && latlng.includes(',')){
    const [lat,lon] = latlng.split(',').map(s=>s.trim());
    fetchWeather(lat, lon);
    return;
  }
  const village = document.getElementById('f-village').value.trim();
  const district = document.getElementById('f-district').value.trim();
  const state = document.getElementById('f-state').value.trim();
  const q = village || district || state;
  if(!q){ errBox.textContent = 'Please enter a village/district/state, coordinates, or use current location.'; errBox.classList.remove('result-hidden'); return; }
  document.getElementById('locStatus').textContent = 'Looking up location…';
  fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)
    .then(r=>r.json())
    .then(data=>{
      if(data.results && data.results.length){
        const res = data.results[0];
        document.getElementById('f-latlng').value = res.latitude.toFixed(4)+', '+res.longitude.toFixed(4);
        document.getElementById('locStatus').textContent = 'Found: '+res.name+(res.admin1?(', '+res.admin1):'');
        fetchWeather(res.latitude, res.longitude);
      } else {
        errBox.textContent = 'Could not find that place automatically. You can still continue with soil and farm details, or try coordinates directly.';
        errBox.classList.remove('result-hidden');
      }
    }).catch(()=>{
      errBox.textContent = 'Could not reach the location service right now. You can still continue with soil and farm details.';
      errBox.classList.remove('result-hidden');
    });
}

function fetchWeather(lat, lon){
  const box = document.getElementById('weatherResult');
  const tiles = document.getElementById('weatherTiles');
  const errBox = document.getElementById('weatherError');
  errBox.classList.add('result-hidden');
  tiles.innerHTML = '<p class="small">Loading current weather…</p>';
  box.classList.remove('result-hidden');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,sunshine_duration&timezone=auto`;
  fetch(url).then(r=>{ if(!r.ok) throw new Error('bad response'); return r.json(); })
    .then(data=>{
      const c = data.current || {};
      const d = data.daily || {};
      const sunHrs = d.sunshine_duration ? (d.sunshine_duration[0]/3600).toFixed(1) : null;
      tiles.innerHTML = [
        tile('Temperature', c.temperature_2m!=null? c.temperature_2m+' °C':'—'),
        tile('Humidity', c.relative_humidity_2m!=null? c.relative_humidity_2m+' %':'—'),
        tile('Rain (now)', c.precipitation!=null? c.precipitation+' mm':'—'),
        tile('Wind', c.wind_speed_10m!=null? c.wind_speed_10m+' km/h':'—'),
        tile("Today's rainfall", d.precipitation_sum? d.precipitation_sum[0]+' mm':'—'),
        tile('Max / Min temp', (d.temperature_2m_max? d.temperature_2m_max[0]:'—')+' / '+(d.temperature_2m_min? d.temperature_2m_min[0]:'—')+' °C'),
        tile('Sunshine today', sunHrs!=null? sunHrs+' hrs':'—'),
        tile('Condition', weatherCodeText(c.weather_code)),
      ].join('');
      document.getElementById('weatherMeta').textContent = 'Source: Open-Meteo weather API · Retrieved '+new Date().toLocaleString();
      saveFarmData({lat, lon, weatherSnapshot: c, weatherFetchedAt: new Date().toISOString()});
    }).catch(()=>{
      box.classList.add('result-hidden');
      errBox.textContent = 'Could not retrieve live weather right now (network or API issue). You can continue with soil and farm details — weather is optional for the guidance plan.';
      errBox.classList.remove('result-hidden');
    });
}
function tile(label, value){ return `<div class="weather-tile"><b>${value}</b><span>${label}</span></div>`; }
function weatherCodeText(code){
  const map = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',51:'Light drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',80:'Rain showers',95:'Thunderstorm'};
  return map[code] || (code!=null ? 'Code '+code : '—');
}

/* ---------------- GUIDANCE ENGINE ---------------- */
function generatePlan(){
  // gather all inputs
  const loc = { state:val('f-state'), district:val('f-district'), village:val('f-village'), latlng:val('f-latlng') };
  const soil = { ph:val('s-ph'), texture:val('s-texture'), n:val('s-n'), p:val('s-p'), k:val('s-k'), oc:val('s-oc'), moisture:val('s-moisture') };
  const farm = {
    area: val('fp-area'), areaUnit: val('fp-areaunit'),
    waterSource: val('fp-watersource'), waterAvail: val('fp-wateravail'),
    irrigation: val('fp-irrigation'),
    currentCrops: val('fp-currentcrops'), desiredCrops: val('fp-desiredcrops'),
    livestock: getPicked('fp-livestock'),
    budget: val('fp-budget'), experience: val('fp-experience'),
    goals: getPicked('fp-goals')
  };
  saveFarmData({ state:loc.state, district:loc.district, village:loc.village, soilPh:soil.ph, soilTexture:soil.texture,
    area:farm.area, areaUnit:farm.areaUnit, waterSource:farm.waterSource, waterAvail:farm.waterAvail,
    irrigation:farm.irrigation, livestock:farm.livestock, goals:farm.goals });

  const weather = getFarmData().weatherSnapshot || null;
  const items = [];

  // 1. Suitable farming approaches
  if(farm.waterAvail === 'Scarce / seasonal'){
    items.push(plan('Suitable farming approach','Prioritise low-water methods such as drip irrigation and mulched organic beds.','Your reported water availability is scarce/seasonal, so approaches that reduce water loss are more appropriate than flood irrigation.','calc'));
  } else if(farm.waterAvail === 'Abundant'){
    items.push(plan('Suitable farming approach','A wider mix of methods, including hydroponics or standard irrigated cropping, may be workable.','You reported abundant water availability, which supports more water-intensive options if desired.','calc'));
  } else {
    items.push(plan('Suitable farming approach','A mixed approach — organic field cropping plus targeted drip irrigation for high-value crops — may suit moderate water availability.','Water availability was reported as moderate.','general'));
  }

  // 2. Crop suitability
  if(soil.ph){
    const phNum = parseFloat(soil.ph);
    if(phNum < 5.5) items.push(plan('Crop suitability','Consider acid-tolerant crops (e.g. tea, pineapple) or plan for soil amendment before other crops.','Your entered soil pH ('+soil.ph+') is on the acidic side, which limits some crop choices unless corrected.','farmer'));
    else if(phNum > 8) items.push(plan('Crop suitability','Consider alkaline-tolerant crops and monitor micronutrient availability.','Your entered soil pH ('+soil.ph+') is alkaline.','farmer'));
    else items.push(plan('Crop suitability','Your soil pH is in a generally workable range for most common vegetables and cereals.','Entered soil pH ('+soil.ph+') falls within a broadly neutral range.','farmer'));
  } else {
    items.push(plan('Crop suitability','A soil test for pH and nutrients is recommended before finalising crop choice.','No soil pH was entered, so crop-soil matching cannot be precise yet.','verify'));
  }

  // 3. Water management
  items.push(plan('Water management', farm.waterSource==='Rainfed only' ? 'Rainwater harvesting and storage becomes important to bridge dry periods.' : 'Consider supplementing your existing '+ (farm.waterSource||'water source') +' with rainwater harvesting for resilience during shortages.', 'Based on your reported water source ('+(farm.waterSource||'not specified')+').','calc'));

  // 4. Irrigation method
  if(farm.irrigation === 'Flood irrigation' || farm.irrigation === 'None / rain only'){
    items.push(plan('Irrigation method','Drip irrigation may reduce water loss compared to your current method, especially for row crops.','You reported using '+(farm.irrigation||'no irrigation')+', which typically loses more water to evaporation/run-off than targeted delivery.','calc'));
  } else {
    items.push(plan('Irrigation method','Your current method ('+farm.irrigation+') is already relatively targeted — focus on maintenance and coverage.','Based on your reported irrigation method.','general'));
  }

  // 5. Organic farming
  items.push(plan('Organic farming option', farm.goals.includes('Organic production') ? 'Organic practices align directly with your stated goal — begin with composting and reduced chemical inputs.' : 'Organic practices could be introduced gradually alongside your current methods.', farm.goals.includes('Organic production') ? 'You selected "Organic production" as a goal.' : 'General guidance applicable to most farms.', farm.goals.includes('Organic production')?'farmer':'general'));

  // 6. Hydroponics
  if(farm.area && parseFloat(farm.area) < 1 && farm.waterAvail !== 'Scarce / seasonal'){
    items.push(plan('Hydroponics suitability','Small-scale hydroponics may suit your limited land area if reliable power and water are available.','Your reported land area is relatively small, which is where hydroponics is often considered.','calc'));
  } else {
    items.push(plan('Hydroponics suitability','Hydroponics is possible but not obviously prioritised given your land size — it is one option among several, not a universal upgrade.','Based on reported land area and water availability.','general'));
  }

  // 7. Livestock integration
  if(farm.livestock.length && !farm.livestock.includes('None')){
    items.push(plan('Livestock integration','Manure from your '+farm.livestock.join(', ')+' could be directed toward composting or, at sufficient scale, a biogas digester.','You reported keeping: '+farm.livestock.join(', ')+'.','farmer'));
  } else {
    items.push(plan('Livestock integration','Not currently applicable — you reported no livestock, or this was left unanswered.','Based on your livestock selection.','farmer'));
  }

  // 8. Biogas / resource recovery
  if(farm.livestock.length && !farm.livestock.includes('None') && farm.goals.includes('Resource recovery')){
    items.push(plan('Biogas / resource recovery','A small biogas digester may be worth evaluating, subject to feedstock volume and local technical guidance.','You have livestock and selected "Resource recovery" as a goal.','calc'));
  } else {
    items.push(plan('Biogas / resource recovery','Composting is a lower-complexity resource-recovery starting point before considering biogas.','General guidance in the absence of both livestock and a stated resource-recovery goal.','general'));
  }

  // 9. Renewable energy
  items.push(plan('Renewable energy option','A small solar setup for pumps or lighting could reduce dependence on grid power, with grid or manual backup retained.','General guidance — actual sizing depends on your load, which was not specified.','general'));

  // 10. Farm layout suggestion
  items.push(plan('Farm layout suggestion','Group water-intensive elements (hydroponics/drip beds) near your storage tank, and place livestock/biogas areas together but downslope from water storage.','General layout principle for minimising pipe runs and contamination risk.','general'));

  // 11. Priority actions
  const priorities = [];
  if(!soil.ph) priorities.push('Get a soil test done');
  if(farm.waterAvail==='Scarce / seasonal') priorities.push('Assess rainwater harvesting potential');
  if(farm.irrigation==='Flood irrigation') priorities.push('Evaluate switching to drip irrigation');
  if(!priorities.length) priorities.push('Review this plan with a local agricultural expert before investing');
  items.push(plan('Priority actions', priorities.join('; ') + '.', 'Derived from gaps or high-impact items in your entries above.','calc'));

  // 12. Seasonal considerations
  if(weather){
    items.push(plan('Seasonal consideration','Current conditions at your location show '+ (weather.temperature_2m!=null? weather.temperature_2m+'°C':'no temperature data') +' and '+(weather.relative_humidity_2m!=null? weather.relative_humidity_2m+'% humidity':'no humidity data')+' — factor this into short-term planting or irrigation timing.','Based on live weather retrieved for your coordinates.','location'));
  } else {
    items.push(plan('Seasonal consideration','Fetch live weather in Step 1 for a more specific seasonal note, or rely on known local seasonal patterns (e.g. monsoon timing) for now.','No live weather was retrieved in this session.','general'));
  }

  // 13. Risk / limitations
  items.push(plan('Risks / limitations','This plan is generated from self-reported information and general agricultural principles — it does not replace a site visit, a laboratory soil test, or professional agronomic advice.','Standard limitation of any remote, form-based guidance tool.','verify'));

  // 14. Further information required
  const missing = [];
  if(!soil.ph) missing.push('soil pH');
  if(!soil.texture) missing.push('soil texture');
  if(!farm.area) missing.push('exact land area');
  if(!weather) missing.push('local weather data');
  items.push(plan('Further information needed', missing.length? ('For a more precise plan, provide: '+missing.join(', ')+'.') : 'You have provided most key inputs — a physical soil test remains the main outstanding verification step.','Gaps identified from the fields left blank above.','verify'));

  renderPlan(items, loc, farm);
  goStep('plan');
}
function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function plan(title, text, why, source){ return {title,text,why,source}; }
function sourceLabel(source){
  const map = {farmer:['ds-farmer','Farmer-Provided Data'], location:['ds-location','Location-Based Information'], calc:['ds-calc','Calculated Recommendation'], general:['ds-general','General Guidance'], verify:['ds-verify','Requires Local Verification']};
  return map[source] || map.general;
}
function renderPlan(items, loc, farm){
  const out = document.getElementById('planOutput');
  const locStr = [loc.village, loc.district, loc.state].filter(Boolean).join(', ') || 'your farm';
  let html = `<div class="card"><span class="eyebrow">MY FARM GUIDANCE PLAN</span><h3 style="margin-top:6px;">Guidance for ${locStr}</h3><p class="small">Generated from the location, soil, farm and goal information you entered. Each item explains why it was suggested and how confident that suggestion is.</p></div>`;
  items.forEach(it=>{
    const [cls,label] = sourceLabel(it.source);
    html += `<div class="plan-item"><span class="data-source ${cls}">${label}</span><h4>${it.title}</h4><p>${it.text}</p><p class="why">Why: ${it.why}</p></div>`;
  });
  html += `<div class="notice red">This plan is general guidance based on the information you provided plus, where fetched, live weather. It is not a substitute for a physical soil test or advice from a qualified local agricultural expert.</div>`;
  html += `<div class="btn-row"><a href="#crop" class="btn btn-secondary btn-sm">Open Crop Advisor →</a><a href="#planner" class="btn btn-secondary btn-sm">Open Farm Planner →</a><button class="btn btn-ghost btn-sm" onclick="window.print()">Print / Save this plan</button></div>`;
  out.innerHTML = html;
}

/* ---------------- CROP ADVISOR ---------------- */
const cropDB = [
  {name:'Leafy greens (spinach, lettuce, etc.)', water:'Low-Medium', ph:['Acidic (below 6)','Neutral (6–7.5)'], season:['Rabi (winter)','Year-round / greenhouse'], goal:['Lower water use','Diversification','Higher productivity'], note:'Short growing period; well-suited to hydroponics or small beds.'},
  {name:'Rice', water:'High', ph:['Acidic (below 6)','Neutral (6–7.5)'], season:['Kharif (monsoon)'], goal:['Higher productivity'], note:'Needs standing water for much of the cycle; not ideal where water is scarce.'},
  {name:'Pulses (lentil, gram)', water:'Low', ph:['Neutral (6–7.5)','Alkaline (above 7.5)'], season:['Rabi (winter)'], goal:['Lower water use','Diversification','Organic production'], note:'Fixes nitrogen in soil; useful in rotation.'},
  {name:'Tomato / brinjal / chilli', water:'Medium', ph:['Neutral (6–7.5)'], season:['Kharif (monsoon)','Rabi (winter)','Year-round / greenhouse'], goal:['Higher productivity','Diversification'], note:'Responds well to drip irrigation; sensitive to waterlogging.'},
  {name:'Betel leaf / areca (regional)', water:'Medium-High', ph:['Acidic (below 6)'], season:['Year-round / greenhouse'], goal:['Diversification'], note:'Common in Assam/NE region; needs shade and consistent moisture.'},
  {name:'Maize', water:'Medium', ph:['Neutral (6–7.5)'], season:['Kharif (monsoon)'], goal:['Higher productivity','Diversification'], note:'Can double as livestock fodder.'},
  {name:'Turmeric / ginger', water:'Medium', ph:['Acidic (below 6)','Neutral (6–7.5)'], season:['Kharif (monsoon)'], goal:['Diversification','Organic production'], note:'High-value regional crop; needs well-drained soil.'},
];
function runCropAdvisor(){
  const season = val('ca-season'), ph = val('ca-ph'), water = val('ca-water'), land = val('ca-land'), goal = val('ca-goal');
  const results = cropDB.filter(c=>{
    let score = 0, total = 0;
    if(season){ total++; if(c.season.includes(season)) score++; }
    if(ph){ total++; if(c.ph.includes(ph)) score++; }
    if(goal){ total++; if(c.goal.includes(goal)) score++; }
    return total===0 || score >= Math.ceil(total*0.5);
  });
  const holder = document.getElementById('cropResults');
  if(!results.length){ holder.innerHTML = '<div class="notice">No close matches for this exact combination — try broadening one filter, or treat this as a signal to consult a local KVK for regionally verified options.</div>'; return; }
  holder.innerHTML = '<div class="notice blue">Showing potentially suitable crop categories — not guaranteed yield or profit. Verify locally before planting at scale.</div>' +
    '<div class="grid grid-3">' + results.map(c=>`
    <div class="card"><h3>${c.name}</h3>
      <p class="small"><b>Water need:</b> ${c.water}</p>
      <p class="small"><b>Suitable season(s):</b> ${c.season.join(', ')}</p>
      <p class="small"><b>Notes:</b> ${c.note}</p>
      <p class="small" style="color:var(--danger)"><b>Precaution:</b> Confirm variety and timing with local agricultural guidance for your exact district.</p>
    </div>`).join('') + '</div>';
}

/* ---------------- WATER CALCULATOR ---------------- */
function calcWater(){
  const area = parseFloat(val('w-area'))||0;
  const rain = parseFloat(val('w-rain'))||0;
  const storage = parseFloat(val('w-storage'))||0;
  const need = parseFloat(val('w-need'))||0;
  // standard estimate: Volume (L) = Area (m2) x Rainfall (mm) x runoff coefficient (0.8)
  const collected = area * rain * 0.8;
  const daysCovered = need>0 ? (Math.min(collected,storage)/need).toFixed(1) : '—';
  const out = document.getElementById('waterCalcOut');
  out.classList.remove('result-hidden');
  out.innerHTML = `
    <div class="notice amber" style="border-color:var(--amber)">
      <p><b>Estimated rainwater collected:</b> <span class="range-out">${collected.toLocaleString(undefined,{maximumFractionDigits:0})} litres</span> for this rainfall period (using an assumed 0.8 run-off coefficient — actual collection is typically lower due to first losses and roof material).</p>
      <p><b>Usable given your storage capacity:</b> <span class="range-out">${Math.min(collected,storage).toLocaleString(undefined,{maximumFractionDigits:0})} litres</span></p>
      <p><b>Days of irrigation this could cover:</b> <span class="range-out">${daysCovered}</span> days at your stated daily requirement.</p>
      <p class="small">This is a planning estimate only, not a hydrological guarantee.</p>
    </div>`;
}

/* ---------------- DRIP CALCULATOR ---------------- */
function calcDrip(){
  const plants = parseFloat(val('d-plants'))||0;
  const per = parseFloat(val('d-perplant'))||0;
  const total = plants*per;
  const out = document.getElementById('dripOut');
  out.classList.remove('result-hidden');
  out.innerHTML = `<div class="notice amber" style="border-color:var(--amber)"><b>Estimated daily water requirement:</b> <span class="range-out">${total.toLocaleString()} litres/day</span>. Actual need varies with crop stage, weather and soil — treat this as a starting estimate.</div>`;
}

/* ---------------- DIAGRAM ANIMATIONS ---------------- */
function toggleHydroFlow(){ ['hydroFlow1','hydroFlow2','hydroFlow3'].forEach(id=>document.getElementById(id).classList.toggle('animate')); }
function toggleDripFlow(){ ['dripMain','dripDist'].forEach(id=>document.getElementById(id).classList.toggle('animate'));
  document.querySelectorAll('.emitter').forEach(e=> e.classList.toggle('animate')); }
function toggleBiogasFlow(){ ['bgFlow1','bgFlow2','bgFlow3','bgFlow4'].forEach(id=>document.getElementById(id).classList.toggle('animate')); }

/* ---------------- ECOCYCLE (built once, interactive) ---------------- */
const ecoNodes = [
  {id:'rain', label:'Rainwater', angle:-90, enters:'Rainfall over the catchment area of the model/farm.', happens:'Water is channelled from roofs and surfaces toward collection points.', comesOut:'Collected raw rainwater.', goesTo:'Water storage'},
  {id:'storage', label:'Water Storage', angle:-45, enters:'Collected rainwater and/or other water sources.', happens:'Water is held in tanks sized to expected demand.', comesOut:'Stored water ready for distribution.', goesTo:'Hydroponics and Drip Irrigation'},
  {id:'hydro', label:'Hydroponics', angle:0, enters:'Stored water plus nutrient solution.', happens:'Roots absorb water and nutrients in a soil-less channel system.', comesOut:'Harvested produce and a recirculating nutrient solution.', goesTo:'Recovery, and produce to the farm output'},
  {id:'drip', label:'Drip Irrigation', angle:35, enters:'Stored water routed through pipes and emitters.', happens:'Water is delivered directly to the crop root zone.', comesOut:'Irrigated crop growth, minimal run-off.', goesTo:'Organic Farm / crop production'},
  {id:'organic', label:'Organic Farm', angle:80, enters:'Irrigated soil, organic inputs (compost/manure).', happens:'Crops grow using organic practices and rotation.', comesOut:'Crop yield and organic residues.', goesTo:'Animal Farm (residues as feed) and Resource Recovery'},
  {id:'animal', label:'Animal Farm', angle:125, enters:'Feed, including some crop residues.', happens:'Livestock is kept as an integrated part of the farm.', comesOut:'Suitable organic waste (manure).', goesTo:'Biogas'},
  {id:'biogas', label:'Biogas', angle:165, enters:'Suitable organic waste from livestock/farm.', happens:'Anaerobic digestion breaks down feedstock.', comesOut:'Biogas and digestate.', goesTo:'Renewable Energy (gas use) and Resource Recovery (digestate)'},
  {id:'recovery', label:'Resource Recovery', angle:-165, enters:'Digestate, used nutrient solution, treated water.', happens:'Suitable outputs are checked and processed for reuse.', comesOut:'Recovered nutrients and water meeting appropriate quality checks.', goesTo:'Water & Nutrient Reuse'},
  {id:'energy', label:'Renewable Energy', angle:-125, enters:'Sunlight (solar) and, where set up, biogas.', happens:'Solar panels generate power; battery stores it; grid backs it up.', comesOut:'Electricity for pumps, sensors and controls.', goesTo:'Powers Water Storage pumps and Smart Farm sensors'},
];
function polar(cx,cy,r,angleDeg){ const a = angleDeg*Math.PI/180; return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
function buildEcoCycle(){
  const svg = document.getElementById('cycleSvg');
  if(!svg || svg.dataset.built) return;
  svg.dataset.built = '1';
  const cx=240, cy=240, r=170;
  let extra = '';
  ecoNodes.forEach(n=>{
    const p = polar(cx,cy,r,n.angle);
    extra += `<g class="cycle-node" data-id="${n.id}" tabindex="0" role="button" aria-label="${n.label}">
      <circle cx="${p.x}" cy="${p.y}" r="26" fill="#FBFCF9" stroke="#3C7A5E" stroke-width="2"/>
      <text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="16">${nodeEmoji(n.id)}</text>
      <text x="${p.x}" y="${p.y+42}" text-anchor="middle" font-size="11" font-weight="700" fill="#12362B">${n.label}</text>
    </g>`;
  });
  svg.innerHTML += extra;
  svg.querySelectorAll('.cycle-node').forEach(g=>{
    g.addEventListener('click', ()=>selectCycleNode(g.dataset.id));
    g.addEventListener('keypress', (e)=>{ if(e.key==='Enter') selectCycleNode(g.dataset.id); });
  });
}
function nodeEmoji(id){ return {rain:'🌧️',storage:'🛢️',hydro:'🥬',drip:'💧',organic:'🌾',animal:'🐄',biogas:'🔥',recovery:'♻️',energy:'☀️'}[id]||'●'; }
function selectCycleNode(id){
  document.querySelectorAll('#cycleSvg .cycle-node').forEach(g=> g.classList.toggle('selected', g.dataset.id===id));
  const n = ecoNodes.find(x=>x.id===id);
  document.getElementById('cycleDetail').innerHTML = `
    <span class="eyebrow">${n.label.toUpperCase()}</span>
    <h3 style="margin-top:6px;">${n.label}</h3>
    <p class="small"><b>What enters:</b> ${n.enters}</p>
    <p class="small"><b>What happens:</b> ${n.happens}</p>
    <p class="small"><b>What comes out:</b> ${n.comesOut}</p>
    <p class="small"><b>Where it goes next:</b> ${n.goesTo}</p>`;
}

/* ---------------- EXPLORE RESORT MAP ---------------- */
const mapZones = [
  {id:'z1', label:'Rainwater Harvesting', x:40, y:30, w:90, h:50, desc:'Roof/surface catchment channelling rain into the storage system.'},
  {id:'z2', label:'Water Storage', x:150, y:30, w:80, h:50, desc:'Underground/tank storage holding harvested and supply water.'},
  {id:'z3', label:'Hydroponics Greenhouse', x:250, y:20, w:100, h:60, desc:'Soil-less growing channels with recirculating nutrient solution.'},
  {id:'z4', label:'Drip Irrigation Farm', x:370, y:30, w:90, h:50, desc:'Row crops fed through drip lines from the main water supply.'},
  {id:'z5', label:'Organic Farming', x:40, y:110, w:90, h:50, desc:'Crops grown using compost, manure and organic practices.'},
  {id:'z6', label:'Animal Farm', x:150, y:110, w:80, h:50, desc:'Livestock housing; source of manure for biogas and compost.'},
  {id:'z7', label:'Biogas Plant', x:250, y:110, w:100, h:50, desc:'Anaerobic digester converting suitable waste into biogas and digestate.'},
  {id:'z8', label:'Water Recovery / Reuse', x:370, y:110, w:90, h:50, desc:'Treatment and quality check point before appropriate water reuse.'},
  {id:'z9', label:'Solar Energy', x:40, y:190, w:90, h:50, desc:'Solar panels, controller and battery supplying model power.'},
  {id:'z10', label:'Control / Sensor Zone', x:150, y:190, w:80, h:50, desc:'Where temperature, moisture and water-level sensing is (or will be) centralised.'},
];
function buildMap(){
  const svg = document.getElementById('mapSvg');
  if(!svg || svg.dataset.built) return;
  svg.dataset.built = '1';
  let html = '<rect x="0" y="0" width="480" height="340" fill="#EEF2E8"/>';
  mapZones.forEach(z=>{
    html += `<g class="zone" data-id="${z.id}" tabindex="0" role="button" aria-label="${z.label}">
      <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10" fill="#FBFCF9" stroke="#3C7A5E" stroke-width="2"/>
      <text x="${z.x+z.w/2}" y="${z.y+z.h/2+4}" text-anchor="middle">${z.label}</text>
    </g>`;
  });
  svg.innerHTML = html;
  svg.querySelectorAll('.zone').forEach(g=>{
    g.addEventListener('click', ()=>{
      svg.querySelectorAll('.zone').forEach(z=>z.classList.remove('selected'));
      g.classList.add('selected');
      const z = mapZones.find(x=>x.id===g.dataset.id);
      document.getElementById('mapDetail').innerHTML = `<span class="eyebrow">ZONE</span><h3 style="margin-top:6px;">${z.label}</h3><p class="small">${z.desc}</p>`;
    });
  });
}

/* ---------------- KNOWLEDGE CENTRE ---------------- */
const knowledgeTopics = [
  {t:'Rainwater harvesting', b:'Collecting rain from roofs or surfaces and storing it for later use, reducing dependence on other water sources.'},
  {t:'Soil health', b:'The condition of soil in terms of nutrients, structure and biological activity — the foundation for reliable crop growth.'},
  {t:'Irrigation', b:'Supplying water to crops artificially, using methods ranging from flooding fields to precise drip systems.'},
  {t:'Hydroponics', b:'Growing plants in a nutrient solution instead of soil, usually in a controlled structure like a greenhouse.'},
  {t:'Organic farming', b:'Farming using organic inputs such as compost and manure, and biological pest management, instead of most synthetic chemicals.'},
  {t:'Livestock integration', b:'Keeping animals as part of the same farm system so their waste and the farm\'s residues support each other.'},
  {t:'Biogas', b:'A fuel gas produced when organic matter breaks down without oxygen (anaerobic digestion), alongside a by-product called digestate.'},
  {t:'Renewable energy', b:'Energy from sources that naturally replenish, such as sunlight, used here mainly via solar panels.'},
  {t:'Water conservation', b:'Practices that reduce unnecessary water use or loss across the whole farm system.'},
  {t:'Smart farming', b:'Using sensors, data and simple automation to make farm decisions more informed and timely.'},
  {t:'Sustainable agriculture', b:'Farming in a way that meets present needs while maintaining the land\'s ability to produce in future.'},
];
const glossary = [
  ['Anaerobic digestion','Breakdown of organic matter by microbes in the absence of oxygen, producing biogas.'],
  ['Digestate','The nutrient-rich material left over after anaerobic digestion.'],
  ['Drip emitter','A small device that releases water slowly and directly at a plant\'s root zone.'],
  ['NFT (Nutrient Film Technique)','A hydroponic method where a thin film of nutrient solution flows past plant roots.'],
  ['Run-off coefficient','A factor representing the share of rainfall that becomes usable run-off from a catchment surface.'],
  ['Digestate reuse','Using treated digestate as a soil input after appropriate handling and quality checks.'],
  ['KVK (Krishi Vigyan Kendra)','A district-level agricultural science centre providing farmer training and advisory services in India.'],
];
function buildKnowledge(){
  const holder = document.getElementById('accordionHolder');
  if(holder && !holder.dataset.built){
    holder.dataset.built='1';
    holder.innerHTML = knowledgeTopics.map((k,i)=>`
      <div class="acc-item">
        <button class="acc-head" onclick="this.parentElement.classList.toggle('open')">${k.t} <span class="acc-plus">+</span></button>
        <div class="acc-body"><div class="acc-body-in"><p class="small">${k.b}</p></div></div>
      </div>`).join('');
  }
  const gt = document.getElementById('glossaryTable');
  if(gt && !gt.dataset.built){
    gt.dataset.built = '1';
    gt.innerHTML = '<tr><th>Term</th><th>Meaning</th></tr>' + glossary.map(g=>`<tr><td class="bold">${g[0]}</td><td>${g[1]}</td></tr>`).join('');
  }
  buildAlerts();
}
function buildAlerts(){
  const panel = document.getElementById('alertPanel');
  const d = getFarmData();
  if(!panel) return;
  if(!d.weatherSnapshot){
    panel.innerHTML = '<div class="notice">No saved weather yet — visit Farm Mentor → Location & Weather and fetch weather for your location to see alerts here.</div>';
    return;
  }
  const w = d.weatherSnapshot;
  const alerts = [];
  if(w.precipitation > 5) alerts.push('Rain currently detected at your location — consider delaying fertilizer application until conditions clear.');
  if(w.temperature_2m > 35) alerts.push('High temperature reported — crops and livestock may need additional water/shade during peak hours.');
  if(w.wind_speed_10m > 30) alerts.push('Strong wind reported — secure loose greenhouse/hydroponic structures if applicable.');
  if(!alerts.length) alerts.push('No specific alert conditions detected in the last retrieved weather snapshot for your location.');
  panel.innerHTML = '<div class="grid grid-2">' + alerts.map(a=>`<div class="card"><span class="data-source ds-location">Location-Based Information</span><p class="small">${a}</p></div>`).join('') + '</div>';
}

/* ---------------- COST PLANNER ---------------- */
const costRanges = {
  'Land prep':'Setup: land clearing/levelling. Recurring: minimal once established.',
  'Irrigation / pump':'Setup: pump, pipes, drip/sprinkler fittings. Recurring: electricity/fuel and periodic part replacement.',
  'Greenhouse / hydroponics':'Setup: structure, channels, reservoir, pump. Recurring: nutrients, electricity, occasional part replacement.',
  'Solar':'Setup: panels, controller, battery. Recurring: minimal; battery replacement after several years.',
  'Livestock shelter':'Setup: housing/fencing. Recurring: feed and veterinary care.',
  'Biogas digester':'Setup: digester unit and piping. Recurring: feedstock handling and occasional maintenance.',
};
function showCostPlan(){
  const picked = getPicked('costChips');
  const out = document.getElementById('costOut');
  if(!picked.length){ out.innerHTML = '<p class="small">Select at least one element above.</p>'; return; }
  out.innerHTML = picked.map(p=>`<div class="plan-item"><span class="data-source ds-general">Estimated Planning Category</span><h4>${p}</h4><p class="small">${costRanges[p]}</p></div>`).join('') +
    '<div class="notice red">These are planning categories, not quoted prices. Actual cost depends on scale, region and supplier — always get local quotations before budgeting.</div>';
}

/* ---------------- IMPACT DASHBOARD ---------------- */
const impactMetrics = [
  {label:'Water efficiency', value:62, tag:'Model concept'},
  {label:'Resource recovery', value:48, tag:'Potential'},
  {label:'Renewable energy contribution', value:35, tag:'Estimated'},
  {label:'Farming diversity', value:70, tag:'Demonstration'},
  {label:'Reuse potential', value:55, tag:'Simulation'},
  {label:'Systems integrated', value:9, tag:'Model concept', raw:true},
];
function buildImpact(){
  const grid = document.getElementById('gaugeGrid');
  if(!grid || grid.dataset.built) return;
  grid.dataset.built = '1';
  grid.innerHTML = impactMetrics.map(m=>{
    if(m.raw){
      return `<div class="card center"><h3>${m.label}</h3><div style="font-family:var(--serif);font-size:2.4rem;color:var(--forest-2)">${m.value}</div><span class="tag amber">${m.tag}</span></div>`;
    }
    const circumference = 2*Math.PI*55;
    const dash = circumference*(m.value/100);
    return `<div class="card center">
      <div class="gauge"><svg width="140" height="140"><circle cx="70" cy="70" r="55" stroke="#D7DECB" stroke-width="12" fill="none"/><circle cx="70" cy="70" r="55" stroke="#3C7A5E" stroke-width="12" fill="none" stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/></svg><div class="gauge-label">${m.value}%</div></div>
      <h3>${m.label}</h3><span class="tag amber">${m.tag}</span>
    </div>`;
  }).join('');
}
function saveImpactData(){
  const w = val('im-water'), b = val('im-biogas');
  localStorage.setItem('ecoagri_impact', JSON.stringify({water:w, biogas:b, savedAt:new Date().toISOString()}));
  document.getElementById('impactSaved').textContent = 'Saved on this device: '+ (w?('water '+w+'L; '):'') + (b?('biogas '+b+'L/day'):'');
}

/* ---------------- EXHIBITION MODE ---------------- */
const exhibitSlides = [
  {t:'1. Problem', b:'Farmers often adopt water, energy or waste solutions separately, missing efficiency gains only possible when systems are connected.'},
  {t:'2. Existing challenge', b:'Water scarcity, resource waste and limited access to timely, location-specific guidance affect small and marginal farmers.'},
  {t:'3. EcoAgri solution', b:'An integrated physical model connecting rainwater harvesting, hydroponics, drip irrigation, organic farming, livestock, biogas and solar energy — plus a Digital Farm Mentor.'},
  {t:'4. System architecture', b:'Water → Storage → Distribution → Production (hydroponics/drip/organic) → Livestock → Biogas → Resource Recovery → Reuse → Renewable Energy, forming a closed loop.'},
  {t:'5. Water cycle', b:'Rain is harvested, stored, distributed to production systems, and — where treated and quality-checked — appropriately reused.'},
  {t:'6. Farming systems', b:'Hydroponics, drip irrigation and organic farming are demonstrated side by side as complementary methods, not competitors.'},
  {t:'7. Livestock + biogas', b:'Livestock supply suitable organic waste to a biogas digester, producing biogas and digestate for appropriate reuse.'},
  {t:'8. Energy', b:'Solar panels, a controller and battery form the primary renewable supply, backed up by grid power.'},
  {t:'9. Resource recovery', b:'Digestate and treated water are checked for quality before being reused — described as resource recovery, not zero waste.'},
  {t:'10. Digital Farm Mentor', b:'A guidance dashboard that takes a farmer\'s location, soil, water, land, livestock, budget and goals and returns a reasoned, labelled guidance plan.'},
  {t:'11. Innovation', b:'The innovation is the intelligent connection between systems, extended digitally so any farmer — not just this exhibition model — can apply the same thinking.'},
  {t:'12. Future scope', b:'Real sensor integration, measured impact data, and wider testing of the Digital Farm Mentor with real farmers.'},
];
let exhibitIndex = 0, exhibitMax = 12;
function buildExhibition(){
  const holder = document.getElementById('exhibitSlides');
  if(holder.dataset.built) return;
  holder.dataset.built='1';
  holder.innerHTML = exhibitSlides.map((s,i)=>`<div class="exhibit-slide" data-i="${i}"><div class="num">${String(i+1).padStart(2,'0')}</div><h2>${s.t}</h2><p>${s.b}</p></div>`).join('');
  renderExhibitProgress();
  showExhibitSlide(0);
}
function renderExhibitProgress(){
  const p = document.getElementById('exhibitProgress');
  p.innerHTML = exhibitSlides.slice(0,exhibitMax).map((_,i)=>`<div class="${i<=exhibitIndex?'done':''}"></div>`).join('');
}
function showExhibitSlide(i){
  document.querySelectorAll('.exhibit-slide').forEach(s=> s.classList.toggle('active', parseInt(s.dataset.i)===i));
  exhibitIndex = i; renderExhibitProgress();
}
function exhibitNav(dir){
  let next = exhibitIndex+dir;
  if(next<0) next=0; if(next>=exhibitMax) next=exhibitMax-1;
  showExhibitSlide(next);
}
function setExhibitLength(mins){
  exhibitMax = mins===2 ? 6 : 12; // condensed vs full
  showExhibitSlide(0);
}

/* ---------------- FARM PLANNER LAYOUT ---------------- */
function generateLayout(){
  const svg = document.getElementById('layoutSvg');
  if(!svg) return;
  const hydro = val('pl-hydro')!=='No', drip = val('pl-drip')!=='No', live = val('pl-livestock')!=='No', bio = val('pl-biogas')!=='No', solar = val('pl-solar')!=='No';
  const blocks = [{l:'Water Storage', c:'#8FC1D1'}];
  if(hydro) blocks.push({l:'Hydroponics', c:'#E9F3EC'});
  if(drip) blocks.push({l:'Drip Field', c:'#DCEFD8'});
  blocks.push({l:'Organic Field', c:'#EFE7D2'});
  if(live) blocks.push({l:'Livestock', c:'#F3E9DE'});
  if(bio) blocks.push({l:'Biogas', c:'#F0D9B5'});
  if(solar) blocks.push({l:'Solar Area', c:'#FBF2DF'});
  blocks.push({l:'Recovery', c:'#EAF4F7'});

  const cols = 4, w=90, h=70, gapX=10, gapY=14, startX=10, startY=10;
  let html = `<rect x="0" y="0" width="400" height="260" fill="#F6F8F2"/>`;
  blocks.forEach((b,i)=>{
    const col = i%cols, row = Math.floor(i/cols);
    const x = startX + col*(w+gapX), y = startY + row*(h+gapY);
    html += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${b.c}" stroke="#3C7A5E" stroke-width="1.5"/>
      <text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="10" font-family="Inter" font-weight="600" fill="#12362B">${b.l}</text>`;
  });
  svg.innerHTML = html;
}
['pl-length','pl-width','pl-water','pl-hydro','pl-drip','pl-livestock','pl-biogas','pl-solar'].forEach(id=>{
  document.addEventListener('change', (e)=>{ if(e.target.id===id) generateLayout(); });
});

/* ---------------- WATER FLOW SIMULATOR ---------------- */
const simStages = [
  {id:'rain', label:'Rainwater', emoji:'🌧️'},
  {id:'storage', label:'Storage', emoji:'🛢️'},
  {id:'hydro', label:'Hydroponics', emoji:'🥬'},
  {id:'drip', label:'Drip', emoji:'💧'},
  {id:'organic', label:'Organic Farm', emoji:'🌾'},
  {id:'recovery', label:'Recovery', emoji:'♻️'},
];
function buildSimulator(){
  const svg = document.getElementById('simSvg');
  if(!svg || svg.dataset.built) return;
  svg.dataset.built='1';
  const gap = 700/simStages.length;
  let html = '';
  simStages.forEach((s,i)=>{
    const x = gap*i + gap/2;
    html += `<g data-id="${s.id}">
      <circle cx="${x}" cy="80" r="30" fill="#FBFCF9" stroke="#3C7A5E" stroke-width="2"/>
      <text x="${x}" y="86" text-anchor="middle" font-size="18">${s.emoji}</text>
      <text x="${x}" y="128" text-anchor="middle" font-size="11" font-weight="700" fill="#12362B">${s.label}</text>
    </g>`;
    if(i < simStages.length-1){
      html += `<path d="M${x+30},80 L${x+gap-30},80" class="flow-line" id="simline-${i}"/>`;
    }
  });
  document.getElementById('simNodes').innerHTML = html;
  document.querySelectorAll('#simButtons button').forEach(b=>{
    b.addEventListener('click', ()=> runSim(b.dataset.sim, b));
  });
}
function runSim(kind, btnEl){
  document.querySelectorAll('#simButtons button').forEach(b=>b.classList.remove('btn-primary'));
  document.querySelectorAll('#simButtons button').forEach(b=>{ if(b!==btnEl) b.classList.add('btn-ghost'); });
  document.querySelectorAll('[id^="simline-"]').forEach(l=> l.classList.remove('animate'));
  const order = ['rain','storage','hydro','drip','organic','recovery'];
  let upto = order.length-1;
  if(kind!=='full'){ upto = order.indexOf(kind); }
  for(let i=0;i<upto;i++){ document.getElementById('simline-'+i)?.classList.add('animate'); }
  const label = document.getElementById('simLabel');
  const names = {rain:'rainwater harvesting',storage:'water storage',hydro:'hydroponics',drip:'drip irrigation',organic:'the organic farm',recovery:'resource recovery', full:'the full water cycle'};
  label.textContent = 'Animating water flow through: '+ names[kind];
}

/* Trigger initial builds for the home page section that may already be visible */
buildMyFarmSummary();
