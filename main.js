function getMinBuildingPrice () {
    return Math.min(...Game.ObjectsById.map(o => o.bulkPrice))
}

function getUpgradeWorth(name) {
    var prevCps = Game.unbuffedCps
    var a = Game.Upgrades[name]
    a.earn()
    Game.CalculateGains()
    var diffCps = Math.abs(Game.unbuffedCps - prevCps)
    a.unearn()
    // calculates cps gain per money spent
    // doesn't take into account money left
    return ((diffCps) / ((a.getPrice() - Game.cookies) / Game.unbuffedCps))
}

// in ms
var clickingSpeed = 10
var currGoal = null
var buyingTimeoutId = null

function buyStuff () {

    if (currGoal != null) return
    
    var firstUp = Game.UpgradesById[Game.UpgradesInStore[0].id].getPrice()

    var buildingWorths = Game.ObjectsById.map(o => ({ worth: (o.storedCps / ((o.bulkPrice - Game.cookies) / Game.unbuffedCps)), id: o.id, isBuilding: true}))
    var upgradeWorths = Game.UpgradesInStore.map(o => ({ worth: getUpgradeWorth(o.name), id: o.id, isBuilding: false}))
    
    var worthsArray = [...buildingWorths, ...upgradeWorths]
    // bestBuy
    buyBest(worthsArray)
}

function buyUpgrades () {
    Game.UpgradesById[Game.UpgradesInStore[0].id].click()
}

function buyBest (worthsArray) {

    var max = worthsArray.reduce((max, item, id) =>
        item.worth > max.worth ? {worth: item.worth, id: item.id, isBuilding: item.isBuilding} : max,
                                      {worth: 0, id: 0, isBuilding: false})

    worthsArray = worthsArray.map(o => ({ worth: Math.abs(o.worth), id: o.id, isBuilding: o.isBuilding}))
    
    currGoal = worthsArray.reduce((currGoal, item, id) =>
        item.worth > currGoal.worth ? {worth: item.worth, id: item.id, isBuilding: item.isBuilding} : currGoal,
                                      {worth: 0, id: 0, isBuilding: false})
    
    var name = ""
    if (currGoal.isBuilding) {
        name = Game.ObjectsById[currGoal.id].name
    } else {
        name = Game.UpgradesById[currGoal.id].name
    }

    var object = null
    if (currGoal.isBuilding) {
        object = Game.ObjectsById[currGoal.id]
    } else {
        object = Game.UpgradesById[currGoal.id]
    }

    console.clear()
    console.log("want to buy", object.name)

   function checkAndBuy() {
        if (object.getPrice() <= Game.cookies) {
            object.buy()
            currGoal = null
            console.log("Purchased", object.name)
        } else {
            let dt = (object.getPrice()-Game.cookies) / (Game.cookiesPs + Game.mouseCps() * 1000/clickingSpeed);
            console.clear()
            console.log("want to buy", object.name)
            console.log("costs", object.getPrice(), " cookies, need", object.getPrice()-Game.cookies, " cookies");
            console.log("waiting for ", Math.floor(dt/60), "minutes and",  dt % 60 , " seconds")
            buyingTimeoutId = setTimeout(checkAndBuy, 1000) // Check again in 1 second
        }
    }
    
    checkAndBuy()
    
    // // wait until you have the money
    // while (object.basePrice-Game.cookies > 0) { 
    //     console.clear()
    //     console.log("want to buy", object.name)
    //     console.log("costs", object.basePrice, " cookies, need", object.basePrice-Game.cookies, " cookies");
    //     console.log("waiting for ", (object.basePrice-Game.cookies) / Game.cookiesPs, " seconds")
    //     setTimeout(Math.max(0,((object.basePrice-Game.cookies) / Game.cookiesPs)*1000))
    // }
    // object.buy()
    // currGoal = null
}

function clickGoldenCookie () {
    while (Game.shimmers.length > 0) {
        // dont click red cookies
        if (Game.shimmers[0].type = "golden") {
            Game.shimmers[0].pop()
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

    // while (true) {
    //     try {
    //         buyStuff()
    //     } catch (error) {
    //         console.log(error)
    //         stopAutoPlayer()
    //     }  
    //     setTimeout(100)
    // }
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
    clearInterval(BuyingIntervalId)
    clearInterval(ClickingIntervalId)
    clearInterval(ClickingGoldenCookiesIntervalId)
    clearInterval(PlottingPointsItervalId)
    clearTimeout(buyingTimeoutId)
    document.removeEventListener('keydown', stopAutoPlayer, false)
    console.log("auto player stopped")
    stop()
}

function createCanvas () {
    let canvas = document.createElement('canvas')
    canvas.id = "Cookie Chart"
    canvas.width = 400
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
var logbase = 1;

function logg (n) {
    if (logbase == 1) return n;
    return (Math.log(n) / Math.log(logbase))
}

function addPoint () {
    // plotPoints = [...plotPoints, Game.unbuffedCps]
    let cookies = Game.cookies

    if (logg(cookies) > canvas.height) { 
        logbase *= 2
        plotPoints.forEach(o => logg(o))
    }
    plotPoints = [...plotPoints, logg(cookies)]
}

function drawGraph () {
    if (plotPoints.length == 0) return
    let ctx = canvas.getContext('2d')
    let dt = canvas.width / plotPoints.length

    ctx.clearRect(0,0, canvas.width, canvas.height)
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white"

    ctx.beginPath()
    ctx.moveTo(0, canvas.height - plotPoints[0]);

    for (let i = 1; i < plotPoints.length; i++) {
        ctx.lineTo(dt*i, canvas.height - plotPoints[i]);
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
// }, 60000*15)
}, 1000)


document.addEventListener('keydown', (event) => {
    if (event.key == "s") { stopAutoPlayer() }
}, false)

startAutoPlayer()
