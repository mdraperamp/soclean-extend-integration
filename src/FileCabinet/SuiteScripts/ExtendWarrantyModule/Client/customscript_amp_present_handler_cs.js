/**
 *@description: Plan presentation suitelet controller 
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 *@NModuleScope Public
*/
define([], 
function(){
    var exports = {};
    exports.fieldChanged = function(context){
        console.log('Checkbox Handler');
        const objEventRouter = {
            'custpage_select' : handleItemInput
        }

        if(typeof objEventRouter[context.fieldId] !== 'function'){
            return;
        }

        objEventRouter[context.fieldId](context);
        return true;

    };
    exports.saveRecord = function(context){
        var objCurrentRec = context.currentRecord;
        const planCount = objCurrentRec.getLineCount({sublistId: 'custpage_plans'});
        
        var stItemId = '';
        // Get line information from selected line
        for(var i=0; i < planCount; i++){

            var isSelected = objCurrentRec.getSublistValue({
                sublistId: 'custpage_plans', 
                fieldId: 'custpage_select', 
                line: i
            });

            if(isSelected){
                stItemId = objCurrentRec.getSublistValue({
                    sublistId: 'custpage_plans', 
                    fieldId: 'custpage_item_id', 
                    line: i
                });
                break;
            }
        }
        if(!stItemId){
            alert('You have not selected a plan. Please select a plan before submitting.');
            return false;
        }
        else {
            return true;
        }
    };
    function handleItemInput(context){

        var objCurrentRec = context.currentRecord;
        var stLineIndex = objCurrentRec.getCurrentSublistIndex({sublistId: 'custpage_plans'});
        var stLineCount = objCurrentRec.getLineCount({sublistId: 'custpage_plans'});
        var bTrue = objCurrentRec.getCurrentSublistValue({sublistId: 'custpage_plans', fieldId: 'custpage_select'});
        
        if(bTrue == true){
            for(var i = 0; i < stLineCount; i++){
                if(i == stLineIndex) continue;
                objCurrentRec.selectLine({sublistId: 'custpage_plans', line: i});
                objCurrentRec.setCurrentSublistValue({ sublistId: 'custpage_plans', fieldId: 'custpage_select', value: false});
                objCurrentRec.commitLine({sublistId: 'custpage_plans'});
            }
        }
        
        return true;
    }
    exports.handleClose = function(){
        window.close();
    }

    return exports;
});