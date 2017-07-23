"use strict";
//simple factorial, nothing fancy
function fact(num){
    var ret = 1;
    for(var i = 2; i <= num; i++){
        ret = ret * i;
    }
    return ret;
}
//simple nCk
function choose(num, goal){
    return fact(num)/(fact(num-goal)*fact(goal));
}
//X = goal where X~b(p, num)
function binompdf(p, num, goal){
    if(goal > num)
        return 0;
    return Math.pow(p, goal)*Math.pow(1-p, num-goal)*choose(num, goal);
}
//sum elements in an array
function sumEles(vect){
    var result = 0;
    for(var i = 0; i < vect.length; i++){
        result = result + vect[i];
    }
    return result;
}
//multiply each element of an array by a constant
function scalMult(scal, vect){
    for(var i = 0; i < vect.length; i++){
        vect[i] = vect[i]*scal;
    }
    return vect;
}
//output[i] = first[j] + second[k], for all j,k s.t. j+k = i
function vectorMult(first, second){
    var result = [];
    for(var i = 0; i < first.length; i++){
        for(var j = 0; j < second.length; j++){
            var x = first[i]*second[j];
            if(i+j >= result.length)
                result.push(x);
            else
                result[i+j] += x;
        }
    }
    return result;
}
//output[i][j] = first[i]*second[j], modified to maintain a valid probability model after setting output[0][0] = 0 by definition
function vectorProd(first, second){
    var result = [];
    var mod = 1;
    if(use_mod){
        mod = 1/(1-first[0]*second[0])
    }
    for(var i = 0; i < first.length; i++){
        result.push([]);
        for(var j = 0; j < second.length; j++){
            result[i].push(first[i]*second[j]*mod);
        }
    }
    if(use_mod){
        result[0][0] = 0;
    }
    return result;
}
var memo = [];//stores getResult values
//gets the probability distribution of battle survivors AND expected value(EV) remaining alive, in output[0:length-2] and output[length-2:length] respectively.
//All attackers survive = output[0], all defenders survive = output[length-3], EV of attacker = output[length-2], EV of defender = output[length-1]
function getResult(attacker, defender){
    var result = [];
    var val = [];
    val.push(attacker.troop);
    val.push(defender.troop);

    for(var i = 0; i < Attacker.total() + Defender.total() + 3; i++){
        result.push(0);
    }
    if(attacker.total() == 0){
        result[Attacker.total() + defender.total()] = 1;
        result[result.length-1] = defender.value();
    }else if(defender.total() == 0){
        result[Attacker.total() - attacker.total()] = 1;
        result[result.length-2] = attacker.value();
    }else if(val in memo){
        result = memo[val].slice(0);
    }else{
        var matrix = vectorProd(attacker.getHits(), defender.getHits());
        for(var i = 0; i <= attacker.maxhits(); i++){
            for(var j = 0; j <= defender.maxhits(); j++){
                if(matrix[i][j] != 0){
                    var child = getResult(attacker.kill(j, aorder), defender.kill(i, dorder));
                    child = scalMult(matrix[i][j], child);
                    for(var k = 0; k < child.length; k++){
                        result[k] = result[k] + child[k];
                    }
                }
            }
        }

        memo[val] = result.slice(0);
    }
    return result;
}
//tracks troops on one side, and functions for them
class Side{
    constructor(a){
        this.troop = [];
        this.att = a;
        this.reset = function () {
            this.troop = [];
        }
        //distribution of number of hits in one round
        this.getHits = function () {
            var result = [1];
            var t = this.att;
            this.troop.forEach(function(item, index, array){
                var temp = [];
                var hit = troops[index].str[0];
                if(t)
                    hit = troops[index].str[1];
                for(var i = 0; i <= item; i++){
                    temp.push(binompdf(hit/6, item, i));
                }
                result = vectorMult(result, temp);
            })
            return result;
        }
        //total troops in the side
        this.total = function (){
            var result = 0;
            this.troop.forEach(function(item, index, array){
                if(!troops[index].tags.includes("OTL"))
                    result = result + item;
            })
            return result;
        }
        this.maxhits = function (){
            var result = 0;
            this.troop.forEach(function(item, index, array){
                result = result + item;
            })
            return result;
        }
        //return a new side with number troops less, removed in order
        this.kill = function(number, order){
            var result = new Side(this.att);
            for(var i = 0; i < order.length; i++){
                var j = order[i];
                result.troop[j] = this.troop[j];
                if(troops[j].tags.includes("OTL")){
                    result.troop[j] = 0;
                    use_mod = 1;
                }
                if(result.troop[j] < number){
                    number = number - result.troop[j];
                    result.troop[j] = 0;
                }else{
                    result.troop[j] = result.troop[j]-number;
                    number = 0;
                }
            }
            return result;
        }
        //EV of troops in this side
        this.value = function(){
            var result = 0;
            for(var i = 0; i < this.troop.length; i++){
                if(!troops[i].tags.includes("OTL")){
                    result = result + this.troop[i]*troops[i].value;
                }
            }
            return result;
        }
    }
}
//struct for different troop types
class Troop{
    constructor(def, att, val, name, tags){
        this.str = [def, att];
        this.value = val;
        this.name = name;
        this.tags = tags;

        this.printInput = function(){
            $("#" + this.name).empty();
            $("#" + this.name).append("<div class =\"small-2 columns\"><p>" + this.name + "</p></div>");
            $("#" + this.name).append("<div class =\"small-4 columns att\"><input type=\"number\" value=\"0\"></div>");
            $("#" + this.name).append("<div class =\"small-4 columns def\"><input type=\"number\" value=\"0\"></div>");
        }
        this.parse = function(){
            var sect = $("#" + this.name);
            var x = Math.abs(parseInt(sect.children(".att").children()[0].value));
            var y = Math.abs(parseInt(sect.children(".def").children()[0].value));
            if(Number.isNaN(x))
                x = 0;
            if(Number.isNaN(y))
                y = 0;
            Attacker.troop.push(x);
            Defender.troop.push(y);
        }
    }
}
var troops = []; //stores current available troop types
troops.push(new Troop(2, 1, 3, "Infantry", ["land"]));
troops.push(new Troop(2, 3, 5, "Tank", ["land"]));
troops.push(new Troop(4, 3, 12, "Fighter", ["air"]));
troops.push(new Troop(1, 4, 15, "Bomber", ["air"]));
troops.push(new Troop(4, 4, 24, "Battleship", ["OTL"]));
troops[4].printInput = function(){
    $("#" + this.name).empty();
    $("#" + this.name).append("<div class =\"small-2 columns\"><p>" + this.name + "</p></div>");
    $("#" + this.name).append("<div class =\"small-4 columns att\"><input type=\"number\" value=\"0\"></div>");
    $("#" + this.name).append("<div class =\"small-4 columns def\"></div>");
}
troops[4].parse = function(){
    var sect = $("#" + this.name);
    var x = Math.abs(parseInt(sect.children(".att").children()[0].value));
    if(Number.isNaN(x))
        x = 0;
    Attacker.troop.push(x);
    Defender.troop.push(0);
    if(x > 0){
        use_mod = 0;
    }
}
var use_mod = 1;

var Attacker = new Side(true);
var Defender = new Side(false);
var answer = [];
var values = [];
var aorder = [];
var dorder = [];
var len = 8;
var win = 0;

//main function from "Calculate"
function run(){
    Attacker.reset();
    Defender.reset();
    aorder = [];
    dorder = [];
    var a = $("#aOrder").children("#sortable").children("li");
    var d = $("#dOrder").children("#sortable").children("li");
    aorder.push(4);
    for(var i = 0; i < a.length; i++){
        aorder.push(a[i].value);
        dorder.push(d[i].value);
    }
    troops.forEach(function(item, index, array){
        item.parse();
    })
    answer = getResult(Attacker, Defender, 0);
    values = answer.splice(answer.length-2, 2);
    values[0] = Attacker.value()-values[0];
    values[1] = Defender.value()-values[1];
    memo = [];
    len = $("#length")[0].value;
    printOutput();
}


//print at webpage load
function print(){
    troops.forEach(function(item, index, array){
        var next = "<div class = \"row\" id =\"" + item.name + "\">\n</div>";
        $("#input").append(next);
        item.printInput();
    })
    printOrder();
}
//print sortable lists
function printOrder(){
    var x = $("#aOrder").children("#sortable");
    var y = $("#dOrder").children("#sortable");
    troops.forEach(function(item, index, array){
        if(!item.tags.includes("OTL")){
            var next = "<li class=\"ui-state-default\" value = " + index +">" + item.name + "</li>";
            x.append(next);
            y.append(next);
        }
    })
}
//print result after calculations
function printOutput(){
    printProbabilities();
    printEV();
}
//print distribution after calculation
function printProbabilities(){
    var c = 0;
    $("#nums").empty();
    $("#cumul").empty();
    $("#indiv").empty();
    $("#nums").append("<th>Attackers survive</th>");
    $("#cumul").append("<td>Cumulative</td>");
    $("#indiv").append("<td>Individual</td>");
    answer.forEach(function(item, index, array){
        if(Attacker.total()-index == 0){
            win = c;
            c = 0;
        }else if(Attacker.total()-index == -1){
            c = 100 - c - win;
        }
        if(Attacker.total()-index >= 0){
            c = c + item*100;
        }
        $("#nums").append("<th>" + Math.abs(Attacker.total()-index)+"</th>");
        $("#cumul").append("<td>" + format(c, len) + "</td>");
        $("#indiv").append("<td>" + format(item*100, len) + "</td>");

        if(Attacker.total()-index < 0){
            c = c - item*100;
        }
    })
    $("#nums").append("<th>Defenders survive</th>");
    $("#cumul").append("<td></td>");
    $("#indiv").append("<td></td>");

}
//print expected value of calculation
function printEV(){
    $("#EV").empty();
    $("#EV").append("<td>" + format(win, len) + "</td>");
    $("#EV").append("<td>" + format(values[0], len) + "</td>");
    $("#EV").append("<td>" + format(values[1], len) + "</td>");
    $("#EV").append("<td>" + format(values[1]-values[0], len) + "</td>");
    $("#EV").append("<td>" + format(values[1]/values[0], len) + "</td>");
}
//custom number formatting for output
function format(n, length){
    if(n > -.000001 & n < .000001 & length > 5)
        return n.toPrecision(length-5);
    var temp = String(n.toPrecision(length));
    return temp.length <= n ? temp : temp.substr(0, length);
}

print();//print for webpage load
