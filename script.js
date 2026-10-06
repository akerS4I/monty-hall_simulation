const doorCountInput = document.getElementById('doorCount');
const trialCountInput = document.getElementById('trialCount');
const runBtn = document.getElementById('runBtn');
const doorsEl = document.getElementById('doors');
const stageLabel = document.getElementById('stageLabel');
const stageCaption = document.getElementById('stageCaption');
const resultsEl = document.getElementById('results');
const verdictEl = document.getElementById('verdict');

function theoreticalOdds(n){
  const stay = 1/n;
  const sw = (n-1)/(n*(n-2));
  return {stay, sw};
}

function fraction(p){
  // present as a simple percentage-friendly string, and a rough fraction for footnote
  return (p*100).toFixed(1)+'%';
}

function updateFootnote(n){
  const {stay, sw} = theoreticalOdds(n);
  document.getElementById('fn-n').textContent = n;
  document.getElementById('fn-stay').textContent = fraction(stay);
  document.getElementById('fn-switch').textContent = fraction(sw);
}
updateFootnote(3);

function buildDoors(n){
  doorsEl.innerHTML = '';
  const size = n > 16 ? 40 : n > 10 ? 50 : 64;
  const height = n > 16 ? 68 : n > 10 ? 84 : 104;
  for(let i=0;i<n;i++){
    const d = document.createElement('div');
    d.className = 'door';
    d.style.width = size+'px';
    d.style.height = height+'px';
    d.id = 'door-'+i;
    d.innerHTML = '<span class="num">'+(i+1)+'</span><span class="glyph"></span>';
    doorsEl.appendChild(d);
  }
}

function resetDoorStyles(){
  document.querySelectorAll('.door').forEach(d=>{
    d.classList.remove('opened','player-pick','kept','final-win','final-lose');
    d.querySelector('.glyph').textContent = '';
  });
}

function sleep(ms){ return new Promise(res=>setTimeout(res,ms)); }

function randInt(n){ return Math.floor(Math.random()*n); }

// Runs ONE animated demonstration round on the stage, returns nothing (visual only)
async function animateSampleRound(n){
  resetDoorStyles();
  const carDoor = randInt(n);
  let playerDoor = randInt(n);

  stageLabel.textContent = 'Sample round — script picks a door at random...';
  await sleep(500);
  document.getElementById('door-'+playerDoor).classList.add('player-pick');
  stageCaption.textContent = 'Contestant door: '+(playerDoor+1);
  await sleep(700);

  // figure out which door stays closed besides player's
  let keepClosed;
  if(playerDoor === carDoor){
    do{ keepClosed = randInt(n); } while(keepClosed === playerDoor);
  } else {
    keepClosed = carDoor;
  }

  const toOpen = [];
  for(let i=0;i<n;i++){
    if(i!==playerDoor && i!==keepClosed) toOpen.push(i);
  }
  // shuffle reveal order a bit for visual interest
  toOpen.sort(()=>Math.random()-0.5);

  stageLabel.textContent = 'Opening every losing door but one...';
  for(const idx of toOpen){
    const el = document.getElementById('door-'+idx);
    el.classList.add('opened');
    el.querySelector('.glyph').textContent = '🐐';
    await sleep(Math.max(15, 900/toOpen.length));
  }
  document.getElementById('door-'+keepClosed).classList.add('kept');
  stageCaption.textContent = 'Two doors remain: '+(playerDoor+1)+' and '+(keepClosed+1);
  await sleep(800);

  const willSwitch = Math.random() < 0.5;
  stageLabel.textContent = willSwitch ? 'Coin flip says: SWITCH' : 'Coin flip says: STAY';
  await sleep(700);

  const finalDoor = willSwitch ? keepClosed : playerDoor;
  const win = finalDoor === carDoor;
  const finalEl = document.getElementById('door-'+finalDoor);
  finalEl.classList.add(win ? 'final-win' : 'final-lose');
  finalEl.classList.add('opened');
  finalEl.querySelector('.glyph').textContent = finalDoor===carDoor ? '🚗' : '🐐';
  // also reveal the car if it wasn't the final pick, for context
  if(finalDoor !== carDoor){
    const carEl = document.getElementById('door-'+carDoor);
    carEl.classList.add('opened');
    carEl.querySelector('.glyph').textContent = '🚗';
  }
  stageLabel.textContent = win ? 'Result: WIN' : 'Result: NO CAR';
  stageCaption.textContent = willSwitch ? 'The contestant switched.' : 'The contestant stayed.';
  await sleep(600);
}

function runBatch(n, trials){
  let switchWins=0, switchTotal=0, stayWins=0, stayTotal=0;
  for(let t=0;t<trials;t++){
    const carDoor = randInt(n);
    const playerDoor = randInt(n);
    let keepClosed;
    if(playerDoor === carDoor){
      do{ keepClosed = randInt(n); } while(keepClosed === playerDoor);
    } else {
      keepClosed = carDoor;
    }
    const willSwitch = Math.random() < 0.5;
    const finalDoor = willSwitch ? keepClosed : playerDoor;
    const win = finalDoor === carDoor;
    if(willSwitch){ switchTotal++; if(win) switchWins++; }
    else { stayTotal++; if(win) stayWins++; }
  }
  return {switchWins, switchTotal, stayWins, stayTotal};
}

function animateCount(el, target, suffix, duration=800){
  const start = 0;
  const t0 = performance.now();
  function step(now){
    const p = Math.min(1, (now-t0)/duration);
    const val = Math.round(start + (target-start)*p);
    el.textContent = val + (suffix||'');
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function runSimulation(){
  const n = Math.max(3, Math.min(30, parseInt(doorCountInput.value)||3));
  const trials = Math.max(10, Math.min(500000, parseInt(trialCountInput.value)||10000));
  doorCountInput.value = n;
  trialCountInput.value = trials;
  updateFootnote(n);

  runBtn.disabled = true;
  resultsEl.style.display = 'none';
  verdictEl.style.display = 'none';
  buildDoors(n);

  await animateSampleRound(n);

  stageLabel.textContent = 'Running '+trials.toLocaleString()+' rounds in the background...';
  stageCaption.textContent = '';
  await sleep(150);

  const {switchWins, switchTotal, stayWins, stayTotal} = runBatch(n, trials);
  const switchPct = switchTotal ? switchWins/switchTotal : 0;
  const stayPct = stayTotal ? stayWins/stayTotal : 0;

  resultsEl.style.display = 'grid';
  document.getElementById('switchTotal').textContent = switchTotal.toLocaleString();
  document.getElementById('stayTotal').textContent = stayTotal.toLocaleString();
  animateCount(document.getElementById('switchWins'), switchWins, '');
  animateCount(document.getElementById('stayWins'), stayWins, '');
  animateCount(document.getElementById('switchPct'), Math.round(switchPct*1000)/10, '%');
  animateCount(document.getElementById('stayPct'), Math.round(stayPct*1000)/10, '%');

  setTimeout(()=>{
    document.getElementById('switchBar').style.width = (switchPct*100)+'%';
    document.getElementById('stayBar').style.width = (stayPct*100)+'%';
  }, 50);

  const {stay: theoStay, sw: theoSwitch} = theoreticalOdds(n);
  const ratio = (switchPct / (stayPct || 0.0001)).toFixed(2);

  verdictEl.style.display = 'block';
  verdictEl.innerHTML =
    'Across this run, switching won <strong>'+fraction(switchPct)+'</strong> of the time versus <strong>'+fraction(stayPct)+'</strong> for staying — roughly <strong>'+ratio+'x</strong> as often. '+
    'With '+n+' doors, theory predicts switching should win about <strong>'+fraction(theoSwitch)+'</strong> of the time, against <strong>'+fraction(theoStay)+'</strong> for staying. '+
    (n===3 ? 'This is the classic 3-door case: switching roughly doubles your odds.' : 'With more doors, the host is forced to reveal more information, so switching pays off even more dramatically than at 3 doors.') +
    '<span class="math">stay ≈ 1/n = '+fraction(theoStay)+'   ·   switch ≈ (n−1)/(n(n−2)) = '+fraction(theoSwitch)+'</span>';

  stageLabel.textContent = 'Simulation complete';
  runBtn.disabled = false;
}

runBtn.addEventListener('click', runSimulation);

// initialize stage with default doors on load
buildDoors(3);