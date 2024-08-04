# cookie-clicker
automatized cookie clicker game progression in a js script

this is a script that can for now:
1. plan ahead the next optimal? thing to buy
2. make a graph of the cookies earned
3. colors to understand choice taken

<br>

the optimality of things are calcualted by the cps earned by buying the item,

both buildings and upgrades are tested.

the exact equation used is the following:
`(o.storedCps / Math.max(((o.bulkPrice - Game.cookies) / getCurrCps()), 1)) * Math.max((getCurrCps() + o.storedCps) / o.bulkPrice, 1)`

the decided item will be in green, the redder an item the farther away its from the selected item

if a building is to be bought and not an upgrade, then also take in account buildings that are closer to multiples of 25

<br>

# running it

you can run the script by just pasting it in the console

or you can put it as a snippet in `sources`, just mind that changes to the script dont save unless you press `ctrl+s`

to stop the program press the `s` key

<img width="1280" alt="image" src="https://github.com/user-attachments/assets/b2d8038d-d201-4648-a9c3-da3fbcadeb5d">
