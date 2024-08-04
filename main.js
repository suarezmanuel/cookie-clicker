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

function buyStuff () {

    if (currGoal != null) return
    
    var buildingWorths = Game.ObjectsById.map(o => ({ worth: getBuildingWorth(o.name, 0), id: o.id }))
    var upgradeWorths = Game.UpgradesInStore.map(o => ({ worth: getUpgradeWorth(o.name), id: o.id }))
    
    // bestBuy
    buyBest(buildingWorths, upgradeWorths)
}

function buyUpgrades () {
    Game.UpgradesById[Game.UpgradesInStore[0].id].click()
}

function buyBest (buildingWorths, upgradeWorths) {

    buildingGoal = buildingWorths.reduce((buildingGoal, item, id) =>
        item.worth > buildingGoal.worth ? {worth: item.worth, id: item.id, isBuilding: item.isBuilding} : buildingGoal,
                                      {worth: 0, id: 0, isBuilding: false})

    upgradeGoal = upgradeWorths.reduce((upgradeGoal, item, id) =>
        item.worth > upgradeGoal.worth ? {worth: item.worth, id: item.id, isBuilding: item.isBuilding} : upgradeGoal,
                                      {worth: 0, id: 0, isBuilding: false})

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

    // console.clear()
    console.log("want to buy", object.name)

   function checkAndBuy() {
        // if buff just ended
        if (interrupt) {
            console.log("buff ended")
            interrupt = false
            currGoal = null
            return
        }
        if (object.getPrice() <= Game.cookies) {
            object.buy()
            currGoal = null
            // console.log("Purchased", object.name)
            latestBought = [...latestBought, object]
        } else {
            let dt = (object.getPrice()-Game.cookies) / (Game.cookiesPs + Game.mouseCps() * 1000/clickingSpeed);
            // console.clear()
            // console.log("lastest stuff bought", latestBought)
            console.log("want to buy", object.name)
            // console.log("costs", object.getPrice(), " cookies, need", object.getPrice()-Game.cookies, " cookies");
            // console.log("waiting for ", Math.floor(dt/60), "minutes and",  dt % 60 , " seconds")
            buyingTimeoutId = setTimeout(checkAndBuy, 1000) // Check again in 1 second
        }
    }

    if (currGoal) {
        checkAndBuy()
    }
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

function startAutoPlayer () {
    
    console.log("auto player started")

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
    if (canvas !== null) {
        document.body.removeChild(canvas)
        canvas = null
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
    canvas.style.right = '10px';
    canvas.style.top = '10px';
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

console.log(canvas)

PlottingPointsItervalId = setInterval (() => {
    try {
        addPoint()
        drawGraph()
    } catch (error) {
        console.log(error)
        stopAutoPlayer()
    }
}, 100)


document.addEventListener('keydown', (event) => {
    if (event.key == "s") { stopAutoPlayer() }
}, false)

startAutoPlayer()
