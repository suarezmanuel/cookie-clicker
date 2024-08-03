# cookie-clicker
automatized cookie clicker game progression in a js script

this is a script that can for now:
1. plan ahead the next optimal? thing to buy
2. make a graph of the cookies earned

<br>

the optimality of things are calcualted by the cps earned by buying the item,

both buildings and upgrades are tested.

the exact equation used is the following:
`((diffCps) / ((a.basePrice - Game.cookies) / Game.unbuffedCps))`

divides the cps gained by the time to get the item.

problem arises when the item is already available, i need to implement recursion

<br>

# running it

you can run the script by just pasting it in the console

or you can put it as a snippet in `sources`, just mind that changes to the script dont save unless you press `ctrl+s`

to stop the program press the `s` key

<img width="1280" alt="image" src="https://github.com/user-attachments/assets/d8dd1ba5-94c7-4b48-b5a1-8074b9c594fa">
