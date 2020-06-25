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
    '../Libs/customscript_amp_util',
], 
(search, runtime, util) => {
    var exports = {};
    exports.beforeSubmit = context => {
        log.debug('Exexction Context', runtime.executionContext);
        
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
            log.debug('Item', stItemLineCount);

            for(let i = 0; i < stItemLineCount; i++){

                log.debug('Item', objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
                
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}),
                    columns: ['type', 'custitem_amp_ext_inv_sku']
                });

                const stItemType = arrFieldLookup.type[0].value;
                
                if(stItemType === 'NonInvtPart'){

                    const arrSkuIds = arrFieldLookup.custitem_amp_ext_inv_sku;
                    const stContractId = objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_contract_id', line: i}); 
                    
                    log.debug('Contract ID', stContractId);
                    
                    if(arrSkuIds.length > 1 && !stContractId){   
                        objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: true});
                        break;
                    }
                }
            }
        } catch(e) {
            log.debug('Extend: Error Setting Extend Field for Job', JSON.stringify(e.message));
        }
    };
    return exports;
});