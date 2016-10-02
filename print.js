"use strict";
function fact(num){
    var ret = 1;
    for(var i = 2; i <= num; i++){
        ret = ret * i;
    }
    return ret;
}
function choose(num, goal){
    return fact(num)/(fact(num-goal)*fact(goal));
}
function binompdf(p, num, goal){
    if(goal > num)
        return 0;
    return Math.pow(p, goal)*Math.pow(1-p, num-goal)*choose(num, goal);
}
function sumEles(vect){
    var result = 0;
    for(var i = 0; i < vect.length; i++){
        result = result + vect[i];
    }
    return result;
}
function scalMult(scal, vect){
    for(var i = 0; i < vect.length; i++){
        vect[i] = vect[i]*scal;
    }
    return vect;
}
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
function vectorProd(first, second){
    var result = [];
    var mod = 1/(1-first[0]*second[0]);
    for(var i = 0; i < first.length; i++){
        result.push([]);
        for(var j = 0; j < second.length; j++){
            result[i].push(first[i]*second[j]*mod);
        }
    }
    result[0][0] = 0;
    return result;
}
var memo = [];
var o = [0, 1, 2, 3];
function getResult(attacker, defender){
    var result = [];
    var val = [];
    val.push(attacker.troop);
    val.push(defender.troop);

    for(var i = 0; i < Attacker.total() + Defender.total() + 1; i++){
        result.push(0);
    }
    if(attacker.total() == 0){
        result[Attacker.total() + defender.total()] = 1;
    }else if(defender.total() == 0){
        result[Attacker.total() - attacker.total()] = 1;
    }else if(val in memo){
        result = memo[val].slice(0);
    }else{
        var matrix = vectorProd(attacker.getHits(), defender.getHits());
        for(var i = 0; i <= attacker.total(); i++){
            for(var j = 0; j <= defender.total(); j++){
                if(matrix[i][j] != 0){
                    var child = getResult(attacker.kill(j, o), defender.kill(i, o));
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

class Side{
    constructor(a){
        this.troop = [];
        this.att = a;
        this.reset = function () {
            this.troop = [];
        }
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
        this.total = function (){
            var result = 0;
            this.troop.forEach(function(item, index, array){
                result = result + item;
            })
            return result;
        }
        this.kill = function(number, order){
            var result = new Side(this.att);
            for(var i = 0; i < order.length; i++){
                var j = order[i];
                result.troop[j] = this.troop[j];
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
    }
}
class Troop{
    constructor(def, att, val, nam){
        this.str = [def, att];
        this.value = val;
        this.name = nam;
    }
}
var troops = [];
troops.push(new Troop(2, 1, 3, "Infantry"));
troops.push(new Troop(2, 3, 5, "Tank"));
troops.push(new Troop(4, 3, 12, "Fighter"));
troops.push(new Troop(1, 4, 15, "Bomber"));

var Attacker = new Side(true);
var Defender = new Side(false);
var answer = [];
var len = 8;


function run(){
    Attacker.reset();
    Defender.reset();
    troops.forEach(function(item, index, array){
        var sect = $("#" + item.name);
        var x = Math.abs(parseInt(sect.children(".att").children()[0].value));
        var y = Math.abs(parseInt(sect.children(".def").children()[0].value));
        if(Number.isNaN(x))
            x = 0;
        if(Number.isNaN(y))
            y = 0;
        Attacker.troop.push(x);
        Defender.troop.push(y);
    })
    answer = getResult(Attacker, Defender, 0);
    memo = [];
    len = $("#length")[0].value;
    printOutput();
}



function print(){
    troops.forEach(function(item, index, array){
        var next = "<div class = \"row\" id =\"" + item.name + "\">\n</div>";
        $("#input").append(next);
        printInput(item);
    })
}
function printInput(item){
    document.getElementById(item.name).innerHTML =
        "<div class =\"small-2 columns\"><p>"
        + item.name +
        "</p></div> <div class =\"small-5 columns att\"><input type=\"number\" value=\"0\"></div><div class =\"small-5 columns def\"><input type=\"number\" value=\"0\"></div>";
}
function printOutput(){
    var c = 0;
    var total = 0;
    $("#nums").empty();
    $("#cumul").empty();
    $("#indiv").empty();
    $("#nums").append("<th>Attackers survive</th>");
    $("#cumul").append("<td>Cumulative</td>");
    $("#indiv").append("<td>Individual</td>");
    answer.forEach(function(item, index, array){
        if(Attacker.total()-index == 0){
            total = c;
            c = 0;
        }else if(Attacker.total()-index == -1){
            c = 100 - c - total;
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
function format(n, c){
    if(n < .000001 & c > 5)
        return n.toPrecision(c-5);
    else
        return String(n.toPrecision(c)).substr(0, c);
}
print();
