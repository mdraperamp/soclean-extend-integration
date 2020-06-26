/**
 *@description: This script is triggered on creation of sales orders
 * via the UI or Ziftr cart, iterates through the lines and identifies
 * warranty items. If this is a warranty order then it is flagged to be
 * queued for Extend Contract creation via the AMP Extend - Create Contracts MR
 * mapreduce script.
 *    
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/search',
    'N/runtime',
    'N/record',
    '../Libs/customscript_amp_util',
], 
(search, runtime, record, util) => {
    var exports = {};
    exports.beforeSubmit = context => {
        log.debug('BEFORESUBMIT: Exexction Context', runtime.executionContext);
        
        // Only execute for orders created via userinterface and webservices
        if(['USERINTERFACE', 'WEBSERVICES'].indexOf(runtime.executionContext) == -1){
            return;
        }
        const objNewRecord = context.newRecord;
       
        try {
            const stItemLineCount = objNewRecord.getLineCount({sublistId: 'item'});
            objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: false});

            // Iterate through the lines to check if the inventory item is associated with a 
            // warranty item sku. If so, flag the order for contract creation and break

            for(let i = 0; i < stItemLineCount; i++){

                log.debug('BEFORESUBMIT: Item', objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
                
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}),
                    columns: ['type', 'custitem_amp_ext_inv_sku']
                });

                const stItemType = arrFieldLookup.type[0].value;
                
                if(stItemType === 'NonInvtPart'){

                    const arrSkuIds = arrFieldLookup.custitem_amp_ext_inv_sku;
                    const stContractId = objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_contract_id', line: i}); 
                                        
                    if(arrSkuIds.length > 1 && !stContractId){   
                        objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: true});
                        break;
                    }
                }
            }
        } catch(e) {
            log.debug('BEFORESUBMIT: Error Setting Extend Field for Job', JSON.stringify(e.message));
        }
    };
    exports.afterSubmit = context => {
        log.debug('AFTERSUBMIT: Exexction Context', runtime.executionContext);
        
        // Only execute for orders created via webservices. These validations will be
        // prohibited via the user interface
        if(['WEBSERVICES'].indexOf(runtime.executionContext) == -1){
            return;
        }

        try {
            const objNewRecord = context.newRecord;
            var objSalesOrder = record.load({
                type: objNewRecord.type,
                id: objNewRecord.id
            });
            var stLineCount = objSalesOrder.getLineCount({sublistId: 'item'});
            var stSkuId = '';
            var stSkuCount = 0;
            var stWarrantyCount = 0;
            var stWarrantyLineCount = 0;
            var arrSkuLines = [];
            var arrWarrantyLines = []

            for(let i = 0; i < stLineCount; i++){
                // Get the item id
                var stItemId = objSalesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                // Look up if the item is configured to be offered 
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: ['custitem_amp_ext_inv_sku', 'custitem_amp_is_warranty']
                });
                var arrLookupIds = arrFieldLookup.custitem_amp_ext_inv_sku;
                var objConfigSkus = {};

                if(arrLookupIds.length > 0){
                    for(var j = 0; j < arrLookupIds.length; j++){
                        objConfigSkus[arrLookupIds[j].value] = arrLookupIds[j].value;
                    }
                }

                const bIsWarranty = arrFieldLookup.custitem_amp_is_warranty;

                if(bIsWarranty){

                    stSkuId = stItemId;
                    var stQuant = objSalesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });

                    stSkuCount += stQuant;
                    stWarrantyLineCount++;
                    if(stQuant > 1) arrSkuLines.push(i);

                } else if(arrLookupIds.length > 1){

                    if(stSkuId){
                        var stQuant = objSalesOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                        stWarrantyCount += objConfigSkus[stSkuId] ?  stQuant : 0;
                        stWarrantyLineCount++;
                        if(stQuant > 1) arrWarrantyLines.push(i);
                        stSkuId = '';
                        
                    }
                }
            }
            log.debug(
                'AFTERSUBMIT: Counts', 
                'Line: ' 
                + stWarrantyLineCount 
                + ', Sku: ' 
                + stSkuCount 
                + ', warranty: ' 
                + stWarrantyCount
                + ', Sku Line Array: '
                + JSON.stringify(arrSkuLines)
                + ', Warranty Line Array: '
                + JSON.stringify(arrWarrantyLines)
            );
            //Run Line Validations
            var stWarrantyId = '';
            var stInvItemId = '';
            if((stSkuCount + stWarrantyCount) != stWarrantyLineCount){
                //Need to split out 
                log.debug('AFTERSUBMIT: ', 'We need to split');
                for(let i = 0; i < stLineCount; i++){
                    //Iterate through lines
                    if(arrSkuLines.indexOf(i) > -1){
                        //edit quantity to 1
                        stInvItemId = objSalesOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        log.debug('AFTERSUBMIT: Inv Item Id', stInvItemId);
                        objSalesOrder.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i,
                            value: 1
                        });
                        stSkuCount--;
                    }
                    else if(arrWarrantyLines.indexOf(i) > -1){
                        //edit quantity to 1
                        stWarrantyId = objSalesOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        log.debug('AFTERSUBMIT: Warranty Id', stWarrantyId);

                        objSalesOrder.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: 1,
                            line: i
                        });
                        stWarrantyCount--;
                    }
                    
                }
                log.debug('AFTERSUBMIT: New Sku Count', stSkuCount);
                log.debug('AFTERSUBMIT: New Warranty Count', stWarrantyCount);
                

            }
            if(arrWarrantyLines.length > 0){
                for(let i = 0; i < stWarrantyCount; i++){
                    log.debug('AFTERSUBMIT: Add line for ', stInvItemId);
                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stInvItemId
                    });
                    log.debug('AFTERSUBMIT: Add line for warranty', stWarrantyId);
                    
                    stLineCount++;

                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stWarrantyId
                    });
                    stSkuCount--;
                    stWarrantyLineCount--;
                }
                log.debug('AFTERSUBMIT: New Line Count', stLineCount);
        
            }
            if(arrSkuLines.length > 0){
                for(let i = 0; i < stSkuCount; i++){
                    log.debug('AFTERSUBMIT: Add standalone line for ', stInvItemId);
                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stInvItemId
                    });
                    stSkuCount--;
                    stWarrantyLineCount--;
                }
            }
            log.debug('AFTERSUBMIT: Saving Record');
            objSalesOrder.save();
        } catch(e){
            log.debug('AFTERSUBMIT: Error creating SO', e);
        }
    };
    return exports;
});