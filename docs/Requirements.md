# Character Information
We load the information about the character from a Hero Lab portfolio. The portfolio is stored as a zip file that contains xml files. See docs/portfolio.htm for more information about the structure of a Hero Lab portfolio, and samples/ExamplePortfolio for an example of an unpacked portfolio file. The key files inside are index.xml which lists all the characters in the portfolio, and the xml files in statblocks_xml/ which contains the full details of each character.  There will only be one character we care about in the portfolio, which will be have characterindex="1" in it's entry in index.xml, and role="pc" in it's xml file in statblocks_xml/.

## Attack Information
We want to extract character information that relates to their ranged attacks.
First we need their base attack bonus to determine how many iterative attacks they have. We can get that from the baseattack attribute of the attack node.
```
<attack attackbonus="+4" meleeattack="+5" rangedattack="+8" baseattack="+4"/>
```

We want to extract their ranged attack from their main weapon. That will be stored in an XML block that looks like this:
```
<ranged>
    <weapon name="+1 shortbow" categorytext="Projectile Weapon" typetext="P" attack="+9" crit="×3" damage="1d6+1" quantity="1">
        <rangedattack attack="+9" rangeinctext="60'" rangeincvalue="60'"/>
        <weight text="2 lbs" value="2"/>
        <cost text="30 gp" value="30"/>
        <description>A shortbow is made up of one piece of wood about 3 feet in length. You need two hands to use a bow, regardless of its size. You can use a shortbow while mounted. If you have a penalty for low Strength, apply it to damage rolls when you use a shortbow. If you have a bonus for high Strength, you can apply it to damage rolls when you use a composite shortbow, but not a regular shortbow. A shortbow fires arrows.</description>
        <wepcategory>Projectile Weapon</wepcategory>
        <weptype>Piercing</weptype>
        <situationalmodifiers text=""/>
    </weapon>
</ranged>
```
The main attributes we want to extract from their weapon are:
name - weapon.name
damage_type - weapon/weptype.innerText
attack - weapon/rangedattack.attack
damage - weapon.damage
crit - weapon.crit
situationalmodifiers - weapon/situationalmodifiers.text

## Buffs
We need to identify any active buffs on the character that would change their attacks that wouldn't already be accounted for by the information we got from the weapon. We use this information to determine which 'Attack Options' are already enabled, and therefore may already be accounted for in the attack information. For example the 'Haste' spell will give the character an additional attack with no iterative attack penalty. To find out which buffs are active we need to know the id of that buff, and we have to look at herolab/lead1.xml. 
In that file there are a lot of <pick> nodes, and we can tell which buff it represents by matching it's "thing" attribute against the known ids of buffs.
For example, Haste being active is represented like this:
```
<pick thing="pHaste" index="8626" batchindex="985" refcount="0" fieldcount="3" source="adjSplTbl">
<field id="pIndex" value="5."></field>
<field id="pIsOn" user="1."></field>
<field id="pDuration" text="1 round/level"></field>
</pick>
```
If haste was not active, then the field with id "pIsOn" will be missing, or have a value other than "1.".

# Attack Options
We want to show what options the character can choose when making an attack. Some of these will be controlled via Hero Lab buffs, such as haste.  Some apply only for one round, or only modify the current full attack, and therefore we want to be able to toggle them on and off via the UI but will need to use the buffs from the character information to determine if it's already enabled by default.

The attack options will be able to modify things like:
- Number of attacks
- Attack bonus
- Attack damage
- Add additional attack damage (such as adding 1d6 fire damage)

There are going to be some attack options that are special cases, such as Spellstrike which adds an additional attack and adds a spell effect to that attack.

Where possible we will want a standard way to define an attack option, so that we can easily add and remove new ones.  The information we will need to be able to track:
- display name
- buff id (optioanl)
- category (so we can group similar options)
- effects

Options for handling the effects (will need to chose one option to implement):
1. Different attributes for tracking all the different effects an option can have
2. A function that gets passed some kind of object that has functions that can be invoked to add attacks, modify attacks, etc.  We may need to give each option a priority attribute in case the order in which we invoke these functions matters.

# Display

## Options
Show all of the attack options, and whether or not they are enabled.

## Full Attack Card
This section shows all of the attacks that would be made if the character made a full attack.  It will automatically update based on the character information, and the selected options.  The selected options can change things like: number of attacks, bonuses or penalties to hit, bonuses or penalties to damage

## Arcane Points
The total arcane point cost of all options enabled that cost arcane points to use should be displayed.  We only care about the arcane point cost of options that are enabled, and only last one round or are single use.