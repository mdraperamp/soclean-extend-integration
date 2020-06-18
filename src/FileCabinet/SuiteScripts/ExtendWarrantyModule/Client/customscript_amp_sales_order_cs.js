/**
 *@description: 
 * Client script that validates line entries on Sales Order. The script
 * checks if the item is a warranty item and if so, calls a popup suitelet
 * for the user to select the appropriate warranty plan. 
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 *@NModuleScope Public
*/
define([
    'N/url',
    'N/search'
], 
function(url, search) {
    const exports = {};
    exports.pageInit = function(){

    };
    exports.validateLine = function(context){
        log.debug('Validating Line', context.sublistId);

        const objEventRouter = {
            'item' : handleItemInput
        }

        if(typeof objEventRouter[context.sublistId] !== 'function'){
            return;
        }

        objEventRouter[context.sublistId](context);
        return true;
    };
    function handleItemInput(context){

        log.debug('Handling Input', context);
        log.debug('Sublist', context.currentRecord.getSublist({sublistId: context.sublistId}));

        const objCurrentRecord = context.currentRecord;

        const stItemId = objCurrentRecord.getCurrentSublistValue({
            sublistId: context.sublistId,
            fieldId: 'item'
        });

        var bIsWarranty = false;
        // Lookup to item to see if it is eligible for warranty offers
        var objItemLookup = search.lookupFields({
            type: 'serializedinventoryitem',
            id: stItemId,
            columns: 'custitem_amp_is_warranty'
        });

        bIsWarranty = objItemLookup.custitem_amp_is_warranty;

        log.debug('Is warranty', typeof(bIsWarranty) + ', ' + bIsWarranty);
        // If item is not a warranty item, return
        if(!bIsWarranty){
            return true;
        }

        //Resolve suitelet URL
        var slUrl = url.resolveScript({
            scriptId: 'customscript_amp_select_warranty_sl',
            deploymentId: 'customdeploy_amp_select_warranty_sl',
            params: {
                'stItemInternalId' : stItemId
            }
        });

        //Call the pop up suitelet
        window.open(slUrl,'_blank','screenX=300,screenY=300,width=900,height=300,titlebar=0,status=no,menubar=no,resizable=0,scrollbars=0');
        
        return true;
    }
    
    return exports;
});