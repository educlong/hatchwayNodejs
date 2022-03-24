var express = require('express');
var router = express.Router();
const axios = require('axios');

/**====== PROCESSING FOR STEP 4 (BONUS) USING SESSION TO STORE THE DATA (REDUCE THE NUMBER OF CALL TO A SERVER) =======*/
/**Step 04 
 * Checking if session existed or not, and respond an array that is a list of requestField (excluding fields in the session)
 * @param sessions: sessions in the API, if session doesnot exist, sessions=undefined
 * @param listFields: list of fields from the URL, separate by the comma
 * @returns an array of all requestField (excludes fields in the session)
 *      If session equals undefined, return all the requestField. If not, return requestFields that are not in the session
*/
function requestFields(sessions,listFields) {
    var listRequestFields = []
    //check if session existed
    if(typeof sessions !== "undefined"){
        for (let index = 0; index < listFields.length; index++) 
            if(sessions.includes("field-"+listFields[index])===false)   //filtering requestField that are not in the session
                listRequestFields.push(axios.get('https://api.hatchways.io/assessment/blog/posts?tag='+listFields[index]))
    }
    //check if session does not exist
    else 
        listFields.forEach(field => listRequestFields.push(axios.get('https://api.hatchways.io/assessment/blog/posts?tag='+field)));
    return listRequestFields
}

/**Step 04 
 * get the session.
 * @param sessions the previous session
 * @param listRequestFields an array of all requestField
 * @param listFields list of fields from the URL, separate by the comma
 * @param response the return response after calling axios
 * @returns a list of session including the previous session and new fields from listFields (list of fields from the URL)
*/
function requestSessions(sessions,listRequestFields,listFields,response) {
    var sessionsFileds = null
    //check if session does not exist, storing all the fields from the listFields into the session
    if(typeof sessions === "undefined"){
        sessionsFileds = "["
        for (let index = 0; index < listRequestFields.length; index++)
        sessionsFileds += "{\"field-"+listFields[index]+"\":"+JSON.stringify(response[index].data.posts)+"}"
                        +(index===(listRequestFields.length-1) ? ']':",")
    }
    //check if session existed, storing new fields from the listFields into the session (ignore the previous fields)
    else{
        sessionsFileds=sessions
        for (let index = 0; index < listRequestFields.length; index++) {    //loop for all new fields
            var nameField = response[index].request.path.substring(response[index].request.path.indexOf('=')+1)
            //checking if the session is not contain this field, if not, add this field into the session
            if(sessions.includes("field-"+nameField)===false){  
                var arrayFields = JSON.parse(sessionsFileds)
                arrayFields.push({'new-field' :response[index].data.posts})
                sessionsFileds=JSON.stringify(arrayFields).replace("new-field","field-"+nameField)
            }
        }
    }
    return sessionsFileds
}


/**============ PROCESSING FOR ROUTE 01 AND ROUTE 02: REQUEST THE API FOR FIELDS, SORT BY AND DIRECTION ============*/
/**main respond for route 01 and route 02
 * @param req request
 * @param res respond
 * @param next
 * @param route handling for route 01 or route 02
 * @param listFields list of fields from the URL, separate by the comma
 * @param sortBy sortBy (●id, ●reads, ●likes, or ●popularity)
 * @param direct direction for sorting (asc -> ascending or desc -> descending)
 * @returns
 */
function respondFields(req,res,next, route, listFields,sortBy,direct){
    var listRequestFields = requestFields(req.session.sessionFields, listFields) //get list request for axios
    axios.all(listRequestFields).then(axios.spread((...response) => {
        //store a list of fields into the session
        req.session.sessionFields = requestSessions(req.session.sessionFields,listRequestFields,listFields,response)

        //store all the authors from the session into an array (listAuthor)
        var listAuthor = []
        var fields = JSON.parse(req.session.sessionFields)
        for (let iFieldSession = 0; iFieldSession < fields.length; iFieldSession++)
            for (const [key, value] of Object.entries(fields[iFieldSession])) 
                for (let iFields = 0; iFields < listFields.length; iFields++)
                    if("field-"+listFields[iFields]===key)
                        value.forEach(element => listAuthor.push(element));
        
        // remove duplicate (remove authors if these authors have the same id, just keeping one author)
        function removeDuplicateAuthors(datas, key) {return [...new Map(datas.map(x=>[key(x),x])).values()]}
        var authors=removeDuplicateAuthors(listAuthor, it => it.id)

        // sort handling (sort all the author based on sortBy and direction)
        authors.sort((author1, author2) => author1["id"]-author2["id"])
        authors.sort((author1, author2) => 
            direct==="desc" ? author2[sortBy]-author1[sortBy] : author1[sortBy]-author2[sortBy]
        )
        //render for route 01 (ping)
        if(route==="route1")
            res.send(JSON.stringify({"success": authors.length>0 ? true : false }));
        //render for route 02 (post). return an error if fields or sortBy or direction has invalid values
        else authors.length<=0 ? res.send(JSON.stringify({"error":"Tags parameter is required"}))
            : (([null, "id", "reads", "likes", "popularity"].includes(sortBy) && [null, "asc", "desc"].includes(direct))
                ? res.send(JSON.stringify({"posts":authors}))
                : res.send(JSON.stringify({"posts":"sortBy parameter is invalid"})))
    })).catch(error => {
        route==="route1" ? res.send(JSON.stringify({"success":false})) : console.log(error);
    });
}


/**===========route 01: PING ======= */
router.get('/ping/:fields', function(req,res, next){ 
    respondFields(req,res,next, "route1", req.params.fields.split(','),"id",null)})

/**===========route 02: POST ======= */
router.get('/posts/:fields', function(req,res, next){ 
    respondFields(req,res,next, "route2", req.params.fields.split(','),"id",null)})
router.get('/posts/:fields/:sorts', function(req,res, next){ 
    respondFields(req,res,next, "route2", req.params.fields.split(','),req.params.sorts,null)})
router.get('/posts/:fields/:sorts/:direction', function(req,res, next){  
    respondFields(req,res,next, "route2", req.params.fields.split(','),req.params.sorts,req.params.direction)})

module.exports = router;