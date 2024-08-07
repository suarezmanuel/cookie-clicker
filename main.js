function getMinBuildingPrice () {
    return Math.min(...Game.ObjectsById.map(o => o.bulkPrice))
}

function getCurrCps () {
    return Game.globalCpsMult * Game.buildingCps + Game.mouseCps() * 1000/clickingSpeed
}

function getUpgradeWorth(name) {

    var gainedCps = 0
    var a = Game.Upgrades[name]

    // if bingo center research facility
    if (a.id == 64) { 
        // gives 3 more times of the grandmas total cps
        gainedCps = 3 * Game.ObjectsById[1].amount * Game.ObjectsById[1].storedCps;
    } else {
        var prevCps = getCurrCps()
        a.earn()
        Game.CalculateGains()
        gainedCps = Math.abs(getCurrCps() - prevCps)
        a.unearn()
    }

    // golden cookie boosts give half of current cps
    if (a.baseDesc.includes("Golden")) gainedCps = 0.5*getCurrCps();
    
    // (gainedcps / timetoget) times timetopayback
    return (gainedCps / Math.max(((a.getPrice() - Game.cookies) / getCurrCps()), 1)) * ((getCurrCps() + gainedCps)/ a.getPrice())

    
}

// want pretty numbers
// give it priority based on how close to a prett number it is
// 1, 25, 50, 75, 100, ..

function getBuildingWorth(name) {
    var o = Game.Objects[name]
    return (o.storedCps / Math.max(((o.bulkPrice - Game.cookies) / getCurrCps()), 1)) * ((getCurrCps() + o.storedCps) / o.bulkPrice)
    
}

// in ms
var clickingSpeed = 10
var buyingTimeoutId = null
var latestBought = []
var interrupt = false
var stopped = false

function buyStuff () {

    if (stopped) return;

    var unlockedLength = 0;
    for (let i=0; i < 20; i++) {
        if (Game.ObjectsById[i].locked == 1) { break; } 
        unlockedLength++;
    }

    var buildingWorths = Game.ObjectsById.map(o => ({ worth: getBuildingWorth(o.name), id: o.id, amount: o.amount }))
    var upgradeWorths = Game.UpgradesInStore.map(o => ({ worth: getUpgradeWorth(o.name), id: o.id }))

    buildingWorths = buildingWorths.slice(0, unlockedLength);
    // bestBuy
    buyBest(buildingWorths, upgradeWorths)
}

function buyUpgrades () {
    Game.UpgradesById[Game.UpgradesInStore[0].id].click()
}

function buyBest (buildingWorths, upgradeWorths) {

    buildingMax = buildingWorths.reduce((buildingMax, item, id) =>
        item.worth > buildingMax.worth ? {worth: item.worth, id: item.id} : buildingMax,
                                      {worth: 0, id: 0})

    buildingMin = buildingWorths.reduce((buildingMin, item, id) =>
        item.worth < buildingMin.worth ? {worth: item.worth, id: item.id} : buildingMin,
                                      {worth: Infinity, id: 0})
    
    upgradeMax = upgradeWorths.reduce((upgradeMax, item, id) =>
        item.worth > upgradeMax.worth ? {worth: item.worth, id: item.id} : upgradeMax,
                                      {worth: 0, id: 0})

    upgradeMinimum = upgradeWorths.reduce((upgradeMinimum, item, id) =>
        item.worth < upgradeMinimum.worth ? {worth: item.worth, id: item.id} : upgradeMinimum,
                                      {worth: Infinity, id: 0})

    let newMax = buildingMax
    let newMin = buildingMin
    
    var object = null
    
    if (buildingMax.worth > upgradeMax.worth) {

        for (let i=0; i < buildingWorths.length; i++) {
            buildingWorths[i].worth = (buildingWorths[i].worth * (1 + ((buildingWorths[i].amount % 25) / 25)) * (Game.ObjectsById[buildingMax.id].bulkPrice / Game.ObjectsById[i].bulkPrice))
        }
   
        // if we gonna upgrade building, calculate maximum taking 25 in account
        newMax = buildingWorths.reduce((newMax, item, id) =>
        item.worth > newMax.worth ? {worth: item.worth, id: item.id} : newMax,
                                      {worth: 0, id: 0})

        newMin = buildingWorths.reduce((newMin, item, id) =>
        item.worth < newMin.worth ? {worth: item.worth, id: item.id} : newMin,
                                      {worth: Infinity, id: 0})

        object = Game.ObjectsById[newMax.id]
        
    } else {
        object = Game.UpgradesById[upgradeMax.id]
    }

    updateWorthDivs(buildingWorths, newMax, newMin, upgradeWorths, upgradeMax, upgradeMinimum);

    
    checkAndBuy()
    
    function checkAndBuy() {

        if (stopped) { return }

        
        // if buff started or ended
        if (interrupt) {
            // console.log("buff interruption")
            interrupt = false
            setTimeout(buyStuff, 100)
            return
        }

        // console.clear()
        
        if (object.getPrice() <= Game.cookies) {
            object.buy()
            // console.log("bought", object.name)
            setTimeout(buyStuff, 100)
            latestBought = [...latestBought, object]
        } else {
            if (interrupt) { interrupt = false; return }
            let dt = (object.getPrice() - Game.cookies) / getCurrCps();
            // console.log("waiting for", object.name)
            // check if waited enough
            buyingTimeoutId = setTimeout(checkAndBuy, 100)
        }
    }
}

function enableInterrupt() {
    // console.log("interrupt enabled")
    interrupt = true
}

var prevBuffs = []

function helper () {
    // when buff is about to end, replan buying strategy
    var min = Infinity;
    for (i in Game.buffs) {
        min = Math.min(min, Game.buffs[i].time / Game.fps)
    }

    if (min != Infinity) {
        prevBuffs = Game.buffs
        // change strategy when buff starts
        enableInterrupt()
        // change strategy when buff ends
        setTimeout(enableInterrupt, min*1000 + 100)
    }
}

function clickGoldenCookie () {
    while (Game.shimmers.length > 0) {
        // dont click red cookies
        if (Game.shimmers[0].type = "golden") {
            
            Game.shimmers[0].pop()
            
            if (prevBuffs != Game.buffs) {
                setTimeout(helper, 100)
            }
        }
    }
}

// buy upgrades before buildings
var BuyingIntervalId;
var ClickingIntervalId;
var ClickingGoldenCookiesIntervalId;
var PlottingPointsItervalId;
var DrawWorthsIntervalId;
var startingTime;
let f = 0;

function mileStones () {
    
    var currTime = Date.now();
     
    switch (f) {
        case 0:
            if (Game.cookiesEarned > 1000) {
                console.log("milestone of 1K achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 1;
            }
            break;
        case 1:
            if (Game.cookiesEarned > 1000000) {
                console.log("milestone of 1M achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 2;
            }
            break;
        case 2:
            if (Game.cookiesEarned > 1000000000) {
                console.log("milestone of 1B achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 3;
            }
            break;
        case 3:
            if (Game.cookiesEarned > 1000000000000) {
                console.log("milestone of 1T achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 4;
            }
            break;
        case 4:
            if (Game.cookiesEarned > 1000000000000000) {
                console.log("milestone of 1Qua achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 5;
            }
            break;
        case 5:
            if (Game.cookiesEarned > 1000000000000000000) {
                console.log("milestone of 1Qui achieved after", (currTime-startingTime)/(1000*60), " minutes")
                f = 6;
            }
            break;
    }
}

function startAutoPlayer () {
    
    console.log("auto player started")
    initBuildingDivs()
    startingTime = Date.now()
    
    setTimeout (() => {
        try {
            buyStuff()
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, 1000) 

    ClickingIntervalId = setInterval(() => {
        try {
            Game.ClickCookie()
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, clickingSpeed) 

    ClickingGoldenCookiesIntervalId = setInterval (() => {
        try {
            clickGoldenCookie()
            mileStones()
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, 1000)

    PlottingPointsItervalId = setInterval (() => {
        try {
            addPoint()
            drawGraph()
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, 100)

    // the upgrades update their HTML 
    // so we need to write all the time
    DrawWorthsIntervalId = setInterval (() => {
        try {
            updateUpgradeWorthDivs();
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, 10)
}

function stopAutoPlayer () {
    // interrupt a stopping signal (recalculation of choice)
    interrupt = true;
    if (canvas !== null) {
        document.body.removeChild(canvas)
        canvas = null
    }

    for (let i=0; i < buildingWorthsDivs.length; i++) {
        // if (document.querySelector(`#product${i} .content`).querySelector(".worth-div")) {
            document.querySelector(`#product${i} .content`).removeChild(buildingWorthsDivs[i]);
        // }
    }
    
    stopped = true
    clearInterval(BuyingIntervalId)
    clearInterval(ClickingIntervalId)
    clearInterval(ClickingGoldenCookiesIntervalId)
    clearInterval(PlottingPointsItervalId)
    clearTimeout(buyingTimeoutId)
    clearInterval(DrawWorthsIntervalId)
    setTimeout(removeUpgradeWorthDivs, 10)
    document.removeEventListener('keydown', a)
    console.log("auto player stopped")
    stop()
}

var canvas = null
function createCanvas () {
    canvas = document.createElement('canvas')
    canvas.id = "Cookie Chart"
    canvas.width = 200
    canvas.height = 200
    canvas.style.position = 'fixed'; // Change to fixed
    canvas.style.left = '10px';
    canvas.style.bottom = '10px';
    canvas.style.zIndex = '1000000'; // Increase z-index
    canvas.style.display = 'block';
    canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    canvas.style.border = '1px solid white';
    canvas.style.x = 'auto';
    canvas.style.y = 'auto';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas)
    return canvas
}

var plotPoints = []
var canvas = createCanvas()
var divTimes = 1;


function drawMetric (ctx) {
    ctx.font = "20px pixel"
    ctx.fillStyle = "white"
    ctx.fillText("2^" + (divTimes-1).toString() , canvas.width/2, canvas.height/2)
}

function addPoint () {

    let cookies = Game.cookies
    let flag = false
    
    while (cookies/(Math.pow(2,divTimes)) > canvas.height) { 
        divTimes++
        flag = true
    }

    if (cookies )
    
    if (flag == true) {
        if (plotPoints.length >= 20) {
            for (let i=0; i < 20; i++) {
                plotPoints[plotPoints.length - 20 + i] /= 2;
            }
        }
        flag = false
    } else {
        if (divTimes > 4 && cookies < (canvas.height * Math.pow(2,divTimes-4))) {
            for (let i=0; i < 20; i++) {
                plotPoints[plotPoints.length - 20 + i] *= 2;
            }

            divTimes -= 2;
        }
    }
    plotPoints = [...plotPoints, cookies/Math.pow(2,divTimes)]
}

function drawGraph () {
    if (plotPoints.length == 0) return
    let ctx = canvas.getContext('2d')
    let dt = canvas.width / Math.min(plotPoints.length, 20)

    ctx.clearRect(0,0, canvas.width, canvas.height)
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMetric(ctx)
    
    ctx.strokeStyle = "white"

    ctx.beginPath()
    ctx.moveTo(0, canvas.height - plotPoints[Math.max(plotPoints.length - 20 - 1, 0)]);

    for (let i = 0; i < Math.min(plotPoints.length, 20); i++) {
        ctx.lineTo(dt*i, canvas.height - plotPoints[plotPoints.length - 20 + i - 1]);
    }

    ctx.stroke()
}

    
var buildingWorthsDivs = []
var upgradeWorthsDivs = []


function removeUpgradeWorthDivs() {
    console.log("Removing worth divs");
    
    // First, remove divs using our stored references
    upgradeWorthsDivs.forEach((worthDiv, index) => {
        if (worthDiv && worthDiv.parentNode) {
            worthDiv.parentNode.removeChild(worthDiv);
        }
    });
    
    // Then, do a final sweep to catch any divs that might have been added
    var upgrades = document.querySelectorAll('#upgrades .crate.upgrade');
    upgrades.forEach(upgrade => {
        const worthDiv = upgrade.querySelector('.worth-div');
        if (worthDiv) {
            upgrade.removeChild(worthDiv);
        }
    });

    // Clear the array after removing all divs
    upgradeWorthsDivs = [];
}

    
function updateUpgradeWorthDivs () {

    if (stopped) return;
    
    const upgrades = document.querySelectorAll('#upgrades .crate.upgrade');

    for (let i=0; i < Game.UpgradesInStore.length; i++) {
        
        if (upgradeWorthsDivs[i]) {
            if (!upgrades[i].querySelector(".worth-div")) {
                upgrades[i].appendChild(upgradeWorthsDivs[i])
            }
            continue;
        }
        
        const element = document.createElement('div')
        element.className = "worth-div"
        element.style = "color: rgb(0,255,0); font-weight:bold; font-size: 12px"
        if (!upgrades[i].querySelector(".worth-div")) {
            upgrades[i].appendChild(element)
        }
        element.textContent = `worth: 0`
        
        upgradeWorthsDivs = [...upgradeWorthsDivs, element]
    }
}

function initBuildingDivs () {

    var temp = []
    
    for (let i=0; i < 20; i++) {
        const element = document.createElement('div')
        element.style = "color: rgb(0,255,0); font-weight:bold; font-size: 12px"
        // document.getElementById("product" + i).appendChild(element)
        document.querySelector(`#product${i} .content`).appendChild(element)
        element.textContent = `worth: 0`

        temp = [...temp, element]
    }
    
    buildingWorthsDivs = temp
}

function updateWorthDivs (buildingWorths, buildingMax, buildingMin, upgradeWorths, upgradeMax, upgradeMin) {

    var r = 0;
    var g = 0;

    var absoluteMax = Math.max(buildingMax.worth, upgradeMax.worth);

    for (let i=0; i < buildingWorths.length; i++) {
        // will be 1 if on minimum, and 0 on maximum
        var ratio = (absoluteMax - buildingWorths[i].worth) / (absoluteMax - buildingMin.worth);
        r = 255 * ratio
        g = 255 - r;
        buildingWorthsDivs[i].style.color = "rgb(" + r + "," + g + ",0)"
        buildingWorthsDivs[i].textContent = "worth: " + Math.round(buildingWorths[i].worth);
    }

    for (let i=0; i < upgradeWorths.length; i++) {
        var ratio = (absoluteMax - upgradeWorths[i].worth) / (absoluteMax - upgradeMin.worth);
        r = 255 * ratio
        g = 255 - r;
        upgradeWorthsDivs[i].style.color = "rgb(" + r + "," + g + ",0)"
        upgradeWorthsDivs[i].textContent = "worth: " + Math.round(upgradeWorths[i].worth);
    }
}

function a () {
    if (event.key == "s") { stopAutoPlayer() }
}
    
document.addEventListener('keydown', a)

startAutoPlayer()
