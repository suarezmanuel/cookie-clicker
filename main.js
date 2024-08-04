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
        // console.log("name is ", name)
        var prevCps = getCurrCps()
        a.earn()
        Game.CalculateGains()
        gainedCps = Math.abs(getCurrCps() - prevCps)
        a.unearn()
    }

    // golden cookie boosts give half of current cps
    if (a.baseDesc.includes("Golden")) gainedCps = 0.5*getCurrCps();
    
    // (gainedcps / timetoget) times timetopayback
    return (gainedCps / Math.max(((a.getPrice() - Game.cookies) / getCurrCps()), 1)) * Math.max((getCurrCps() + gainedCps)/ a.getPrice(), 1)
}

// want pretty numbers
// give it priority based on how close to a prett number it is
// 1, 25, 50, 75, 100, ..

function getBuildingWorth(name) {
    var o = Game.Objects[name]
    return (o.storedCps / Math.max(((o.bulkPrice - Game.cookies) / getCurrCps()), 1)) * Math.max((getCurrCps() + o.storedCps) / o.bulkPrice, 1)
}

// in ms
var clickingSpeed = 10
var currGoal = null
var buyingTimeoutId = null
var latestBought = []
var interrupt = false

var buildingWorthsDivs = []
var upgradeWorthsDivs = []

function updateUpgradeWorthDivs () {
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

    // console.log(buildingWorths)
    // console.log(buildingMax)
    // console.log(buildingMin)
    
    var r = 0;
    var g = 0;
    
    for (let i=0; i < buildingWorths.length; i++) {
        // will be 1 if on minimum, and 0 on maximum
        var ratio = (buildingMax.worth - buildingWorths[i].worth) / (buildingMax.worth - buildingMin.worth);
        // console.log("enum", buildingMax.worth - buildingWorths[i].worth, " denum", buildingMax.worth - buildingMin)
        r = 255 * ratio
        g = 255 - r;
        // console.log("r", r, " g", g)
        buildingWorthsDivs[i].style.color = "rgb(" + r + "," + g + ",0)"
        buildingWorthsDivs[i].textContent = "worth: " + Math.round(buildingWorths[i].worth);
    }

    // console.log(upgradeWorths)
    for (let i=0; i < upgradeWorths.length; i++) {
        // will be 1 if on minimum, and 0 on maximum
        var ratio = (upgradeMax.worth - upgradeWorths[i].worth) / (upgradeMax.worth - upgradeMin.worth);
        r = 255 * ratio
        g = 255 - r;
        upgradeWorthsDivs[i].style.color = "rgb(" + r + "," + g + ",0)"
        upgradeWorthsDivs[i].textContent = "worth: " + Math.round(upgradeWorths[i].worth);
    }
}

function buyStuff () {

    if (currGoal != null) return
    
    var buildingWorths = Game.ObjectsById.map(o => ({ worth: getBuildingWorth(o.name, 0), id: o.id }))
    var upgradeWorths = Game.UpgradesInStore.map(o => ({ worth: getUpgradeWorth(o.name), id: o.id }))

    var unlockedLength = 0;
    for (let i=0; i < 20; i++) {
        if (Game.ObjectsById[i].locked == 1) { break; } 
        unlockedLength++;
    }

    buildingWorths = buildingWorths.slice(0, unlockedLength);
    
    // bestBuy
    buyBest(buildingWorths, upgradeWorths)
}

function buyUpgrades () {
    Game.UpgradesById[Game.UpgradesInStore[0].id].click()
}

function buyBest (buildingWorths, upgradeWorths) {

    buildingGoal = buildingWorths.reduce((buildingGoal, item, id) =>
        item.worth > buildingGoal.worth ? {worth: item.worth, id: item.id} : buildingGoal,
                                      {worth: 0, id: 0})

    buildingMinimum = buildingWorths.reduce((buildingMinimum, item, id) =>
        item.worth < buildingMinimum.worth ? {worth: item.worth, id: item.id} : buildingMinimum,
                                      {worth: Infinity, id: 0})
    
    upgradeGoal = upgradeWorths.reduce((upgradeGoal, item, id) =>
        item.worth > upgradeGoal.worth ? {worth: item.worth, id: item.id} : upgradeGoal,
                                      {worth: 0, id: 0})

    upgradeMinimum = upgradeWorths.reduce((upgradeMinimum, item, id) =>
        item.worth < upgradeMinimum.worth ? {worth: item.worth, id: item.id} : upgradeMinimum,
                                      {worth: Infinity, id: 0})


    // write and color worths
    updateWorthDivs(buildingWorths, buildingGoal, buildingMinimum, upgradeWorths, upgradeGoal, upgradeMinimum);
    
    var object = null
    if (buildingGoal.worth > upgradeGoal.worth) {

        // if we gonna upgrade building, calculate maximum taking 25 in account
        var newMax = buildingWorths.reduce((newMax, item, id) =>
        item.worth * (1 + ((item.amount % 25) / 25)) * (buildingGoal.worth / item.worth) > buildingGoal.worth * (1 + ((buildingGoal.amount % 25) / 25)) * 1 ? {worth: item.worth * (1 + ((item.amount % 25) / 25)), id: item.id} : newMax,
                                      {worth: 0, id: 0, isBuilding: false})

        object = Game.ObjectsById[newMax.id]
        
    } else {
        object = Game.UpgradesById[upgradeGoal.id]
    }

    checkAndBuy()
    
    function checkAndBuy() {
        // if buff just ended
        if (interrupt) {
            console.log("buff ended")
            interrupt = false
            currGoal = null
        }
        if (object.getPrice() <= Game.cookies) {
            object.buy()
            currGoal = null
            console.log("Purchased", object.name)
            latestBought = [...latestBought, object]
        } else {
            if (interrupt) { interrupt = false; return }
            let dt = (object.getPrice()-Game.cookies) / (Game.cookiesPs + Game.mouseCps() * 1000/clickingSpeed);
            console.clear()
            // console.log("lastest stuff bought", latestBought)
            console.log("want to buy", object.name)
            console.log("waiting for ", Math.floor(dt/60), "minutes and",  Math.round(dt % 60) , " seconds")
            buyingTimeoutId = setTimeout(checkAndBuy, 1000) // Check again in 1 second
        }
    }

    // if (currGoal) {
    //     checkAndBuy()
    // }
}

function enableInterrupt() {
    console.log("interrupt enabled")
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

function startAutoPlayer () {
    
    console.log("auto player started")
    initBuildingDivs()
    
    BuyingIntervalId = setInterval(() => {
        try {
            buyStuff()
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }  
    } , 500)

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
        } catch (error) {
            console.log(error)
            stopAutoPlayer()
        }
    }, 1000)
}

function stopAutoPlayer () {
    // interrupt a stopping signal (recalculation of choice)
    interrupt = true;
    if (canvas !== null) {
        document.body.removeChild(canvas)
        canvas = null
    }
    for (let i=0; i < 20; i++) {
        document.querySelector(`#product${i} .content`).removeChild(buildingWorthsDivs[i]);
    }
    clearInterval(BuyingIntervalId)
    clearInterval(ClickingIntervalId)
    clearInterval(ClickingGoldenCookiesIntervalId)
    clearInterval(PlottingPointsItervalId)
    clearTimeout(buyingTimeoutId)
    document.removeEventListener('keydown', stopAutoPlayer, false)
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
    if (flag == true) {
        
        if (plotPoints.length >= 20) {
            for (let i=0; i < 20; i++) {
                plotPoints[plotPoints.length - 20 + i] /= 2;
            }
        }
        
        flag = false
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

// console.log(canvas)

PlottingPointsItervalId = setInterval (() => {
    try {
        updateUpgradeWorthDivs();
        addPoint()
        drawGraph()
    } catch (error) {
        console.log(error)
        stopAutoPlayer()
    }
}, 100)

DrawWorthsIntervalId = setInterval (() => {
    try {
        updateUpgradeWorthDivs();
    } catch (error) {
        console.log(error)
        stopAutoPlayer()
    }
}, 10)


document.addEventListener('keydown', (event) => {
    if (event.key == "s") { stopAutoPlayer() }
}, false)

startAutoPlayer()
