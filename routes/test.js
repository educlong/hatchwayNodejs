var express = require('express');
var router = express.Router();
const axios = require('axios');

/**============================= PROCESSING FOR STEP 3 TESING =======================*/
/**step 3: test 
 * using this API for testing
 * if the list real fields after render is equal list expect field (from data source) for each element
 * -> render: tesing success. If not, reder: testingfail
 * CALLING TO SERVER FOR TESTING, DO NOT USE SESSION FOR TESTING
*/
router.get('/:fields', function(req,res, next){
    var listFields=req.params.fields.split(',');
    //list real fields after render
    var listRealFields = []
    listFields.forEach(field =>  listRealFields.push(axios.get('http://localhost:3000/api/posts/'+field)));
    //list expect field (from data source)
    var listExpectFields = []
    listFields.forEach(field =>  listExpectFields.push(axios.get('https://api.hatchways.io/assessment/blog/posts?tag='+field)));
    
    axios.all(listRealFields).then(axios.spread((...resReal) => {
        axios.all(listExpectFields).then(axios.spread((...resExpect) => {
            var matchFields =[] //list of statement for each fields (true: if the real field is equal the expect field)
            var indexFieldWrong = -1    //the position of the wrong field
            for (let iReal = 0; iReal < listRealFields.length; iReal++){
                var realPosts = resReal[iReal].data.posts           //get all the authors from the real fields
                for (let iExpect = 0; iExpect < listExpectFields.length; iExpect++){
                    var expectPosts = resExpect[iExpect].data.posts //and get all the authors from the expect fields
                    if(iReal===iExpect){
                        var matchField=[]
                        if(typeof realPosts === 'undefined'){       //render testing fail if the real fields do not exist
                            matchFields.push(false)
                            indexFieldWrong = iReal                 //and let user know the name of wrong fields
                        }
                        else{   //if real fields exists
                            var checkLength = realPosts.length===expectPosts.length //checking the length of real fields and expect fields
                            for (let index = 0; index < realPosts.length; index++){ //checking each author in real fields and expect fields
                                var checkEachAuthor = JSON.stringify(realPosts[index])===JSON.stringify(expectPosts[index])
                                matchField.push(checkLength && checkEachAuthor)     //store the state of check(true/false) for each author
                            }
                            //store the state of check(true/false) for each field. If a author does not match -> return false
                            matchFields.push(JSON.stringify(matchField).includes("false")===false)
                        }
                    }
                }
            }
            //render testing success if each author in the real fields matchs each author in the expect fields
            if(JSON.stringify(matchFields).includes("false")!==true 
                && matchFields.length===listExpectFields.length && matchFields.length===listRealFields.length){
                res.send(JSON.stringify({"posts":"testing success"}))
            }
            //else, if there are just one author that does not match, return testing fail
            else {
                res.send(JSON.stringify({"posts":"testing fail","field wrong":listFields[indexFieldWrong]}))
            }
        })).catch(error => {
            console.log(error);
        });
    })).catch(error => {
        console.log(error);
    });
})
module.exports = router;