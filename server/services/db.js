module.exports = function () {
    var faker   = require("faker");
    var _       = require("lodash");
    var data = {
        typeresources : _.times(10, function (n) {
            return {
                id : n,
                name : faker.hacker.adjective(),
                weight : faker.random.number({max:100}),
                volumen : faker.random.number({max:100}),
                measure : {
                    height : faker.random.number({max:100}),
                    width : faker.random.number({max:100}),
                    depth : faker.random.number({max:100})
                },
                restriction : {
                    minWeight : faker.random.number({max:100}),
                    minVolume : faker.random.number({max:100}),
                    maxWeight : faker.random.number({max:100}),
                    maxVolume : faker.random.number({max:100})   
                }
            }
            
        }),
        Resources : _.times(10, function (n) {
            return {
                id : n,
                licensePlate : faker.hacker.abbreviation()+"-"+faker.random.number({min:100, max:999}),
                name : faker.hacker.noun(),
                typeResource : {id : n}
            }
        })
    };

    return data;
};