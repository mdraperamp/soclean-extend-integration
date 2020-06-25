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
    exports.saveRecord = function(context){
        log.debug('Saving Record Validation', context);

        var bResult = validateWarranty(context);
        return bResult;
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
            type: 'item',
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
    function validateWarranty(context){

        var objCurrentRec = context.currentRecord;	
		var patternSalesOrder = /^[S][O][0-9]{1,10}?$/;
		var patternSerialNumber = /^[S][C][1][2][0][0][0-9]{1,11}?$/;
		var patternSku = /^[S][C][0-9]{4,4}?$/;
        var stPreviousSkuQuant = 0;
        var stPreviousSkuId = '';
        var stPreviousSkuLine = 0;
        // Iterate through the lines to check if the inventory item is associated with a 
        // warranty item sku. If so, we need to gather information about the number of items
        // in the list
        const stItemLineCount = objCurrentRec.getLineCount({sublistId: 'item'});
        for(var i = 0; i < stItemLineCount; i++){
            var stItemId = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
           
            var arrFieldLookup = search.lookupFields({
                type: 'item',
                id: stItemId,
                columns: ['type', 'custitem_amp_ext_inv_sku', 'custitem_amp_is_warranty']
            });
            log.debug('Item Lookup', arrFieldLookup);
            
            var arrLookupIds = arrFieldLookup.custitem_amp_ext_inv_sku;
            var objConfigSkus = {};
            if(arrLookupIds.length > 0){
                for(var j = 0; j < arrLookupIds.length; j++){
                    objConfigSkus[arrLookupIds[j].value] = arrLookupIds[j].value;
                }
            }
            // log.debug('Obj of config ids', objConfigSkus);
            
            const stItemType = arrFieldLookup.type[0].value;
            // If the item is inventory, check if it is a warranty item designated as LIVE
            if(stItemType === 'InvtPart'){
                const bIsWarranty = arrFieldLookup.custitem_amp_is_warranty;
                if(bIsWarranty){
                    // Item is live, get values for warranty compares downstream
                    stPreviousSkuQuant = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});
                    stPreviousSkuId = stItemId;
                    stPreviousSkuLine = i;
                }
            }

            var stConfigSkuId = '';
            if(stItemType === 'NonInvtPart'){

                // stConfigSkuId = arrFieldLookup.custitem_amp_ext_inv_sku[0].value;
                stConfigSkuId = objConfigSkus[stPreviousSkuId];
                
                const stContractId = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_contract_id', line: i}); 
                
                log.debug('Contract ID', stContractId);
                // If a contract ID already exits (it shouldnt) skip this logic
                if(stConfigSkuId && !stContractId){

                    if(stPreviousSkuId == stConfigSkuId){
                        // Order is not stand alone or contains associated SKU items. The warranty is covering the previous SKU
                        if(objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: stPreviousSkuLine}) > 1){
                            alert("Warranty Validation Alert: You must enter a quantity of 1 for items covered by warranty. Please ensure only 1 Warranty is being sold per SKU.");
                            return false;
                        }
                        stPreviousSkuId = '';

                    } else if(!stPreviousSkuId && stConfigSkuId){
                        // Order is a stand alone order. No SKUS are associated with the warranty
                        // Validate necessary fields are populated for the original order
                        const stOrderNumber = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_warranty_order_num', line: i});
                        const stOrderDate = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_original_order_date', line: i});
                        const stOrderSerialNum = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_serial_number', line: i});
                        const stOrderSKU = objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_original_sku', line: i});

                        if(objCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i}) > 1){
                            alert("Warranty Validation Alert: You must enter a quantity of 1 for a warranty. You may not purchase multiple warranties on a single line.");
                            return false;
                        }
                        if(patternSalesOrder.test(stOrderNumber) == false) {
                            alert("Warranty Validation Alert: ORIGINAL ORDER NUMBER requires a valid NetSuite Sales Order Number for line: " + (i + 1) + ".");
                            return false;
                        }
                        if(!stOrderDate) {
                            alert("Warranty Validation Alert: ORIGINAL ORDER DATE requires a valid date for line: " + (i + 1) + ".");
                            return false;
                        }
                        if (patternSerialNumber.test(stOrderSerialNum) == false) {
                            alert("Warranty Validation Alert: EXTEND SERIAL NUMBER requires a valid Serial Number for line: " + (i + 1) + ".");
                            return false;
                        }
                        if (patternSku.test(stOrderSKU) == false) {
                            alert("Warranty Validation Alert: ORIGINAL ORDER SKU requires a valid Serial Number for line: " + (i + 1) + ".");
                            return false;
                        }
                    }
                    else if(stPreviousSkuId && stConfigSkuId && (stPreviousSkuId != stConfigSkuId)) {
                        log.debug('MisMatch', stPreviousSkuId + '; ' + stConfigSkuId);
                        var stPreviousSkuName = objCurrentRec.getSublistText({sublistId: 'item', fieldId: 'item', line: stPreviousSkuLine});
                        alert("Warranty Validation Alert: You have entered an incorrect warranty for Item: " + stPreviousSkuName + ".");
                        return false;
                    }
                             
                }
            }
        }
        log.debug('Returning True');
		return true; //Return true if you want to continue saving the record.
    }
    
    return exports;
});