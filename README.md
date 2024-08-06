# cookie-clicker

<br>

automatized cookie clicker game progression in a js script

<br>

### this is a script that can for now:
1. plan ahead the next optimal? thing to buy
2. make a graph of the cookies earned
3. color objects to understand current plan

<br>

### todo
1. calculate building cps using .earn(), because grandmas affect other buildings
2. make a graph that shows what was bought over time
3. benchmark time to get a billion or smth

<br>
<br>

the optimality of things are calcualted by the (time to get item) * (time to repay item after buying) <br>
if we decide to buy a building, then between the buildings multiply by (1 + how close to 25) which is a number from 1 to 2 <br>
and multiply by ratio from the max we calculated previously

its important for buildings to be close to multiples of 25 <br>
because they unlock upgrades for themselves at these multiples <br>
both buildings and upgrades are tested.

<br>

the exact equations used are the following:

```

  function getUpgradeWorth(name) {

      ... calculate edge cases

    return (gainedCps / Math.max(((a.getPrice() - Game.cookies) / getCurrCps()), 1)) * ((getCurrCps() + gainedCps)/ a.getPrice())
  }

  function getBuildingWorth(name) {
    var o = Game.Objects[name]
    return (o.storedCps / Math.max(((o.bulkPrice - Game.cookies) / getCurrCps()), 1)) * ((getCurrCps() + o.storedCps) / o.bulkPrice)
  }

  ...
  ...
  ...

  function buyBest (buildingWorths, upgradeWorths) {
  
      ... calculate max,min for buildings, upgrades

     if (buildingMax.worth > upgradeMax.worth) {

        for (let i=0; i < buildingWorths.length; i++) {

          buildingWorths[i].worth =  (buildingWorths[i].worth
                                     * (1 + ((buildingWorths[i].amount % 25) / 25))
                                     * (Game.ObjectsById[buildingMax.id].bulkPrice /   Game.ObjectsById[i].bulkPrice))
        }

      ... recalculate max, min

  }

```

<br>

the wanted item will be in green, the redder an item the farther away its from the wanted item

<br>

# running it

you can run the script by just pasting it in the console

or you can put it as a snippet in `sources`, just mind that changes to the script dont save unless you press `ctrl+s`

to stop the program press the `s` key

<img width="1280" alt="image" src="https://github.com/user-attachments/assets/b2d8038d-d201-4648-a9c3-da3fbcadeb5d">
