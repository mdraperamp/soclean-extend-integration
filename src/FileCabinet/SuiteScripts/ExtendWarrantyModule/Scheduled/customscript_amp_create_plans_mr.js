/**
 *@description: 
 *  Scheduled script that is called from by a single item to create
 *  warranty plan subrecords
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@ModuleScope Public
 */
define([
    'N/record',
    'N/search',
    '../Libs/customscript_amp_item_api',
    '../Libs/customscript_amp_util'
],
(record, search, api, util) => {
    const exports = {};
    const objStatus = {
        'NEW' : 1,
        'UPDATING' : 2,
        'LIVE' : 3,
        'INACTIVE' : 4
    };

    exports.getInputData = (context) => {
        try {
            var objResults = {};
            const arrSearchResults = util.search('item', 'customsearch_amp_items_ready_for_sync');

            for(var i = 0; i < arrSearchResults.length; i++) {
                var stItemId = arrSearchResults[i].id;
                objResults[stItemId] = arrSearchResults[i].getValue({name: 'itemid'});
            }
            return objResults;

        } catch(e){

            log.debug('ERROR in getInputData', e.message);
        }
    };
    exports.map = (context) => {
        try {
            const stItemInteralId = context.key
            const stItemId = context.value;

            const objExistingPlans = getExistingPlans(stItemInteralId);
            log.debug('MAP: Existing Plans', objExistingPlans);
            
            var objResponse = api.getPlansByItem(stItemId);
            var arrPlans = objResponse.plans;
            log.debug('MAP: Extend Plans', arrPlans);

            for(let i=0; i < arrPlans.length; i++){

                if(objExistingPlans[arrPlans[i].id]){
                    arrPlans[i].action = 'update';
                    arrPlans[i].warrantyId = objExistingPlans[arrPlans[i].id];
                    log.debug('MAP: Update Plan', arrPlans[i]);

                } else {
                    arrPlans[i].action = 'create';
                    log.debug('MAP: Create Plan', arrPlans[i]);
                }
            }
            context.write(stItemInteralId, JSON.stringify(arrPlans));
               
        } catch(e){
            log.debug('ERROR in MAP: ', e.message);
        }
    };
    exports.reduce = context => {
        try {
            const stItemInternalId = context.key;
            const arrPlans = JSON.parse(context.values);

            log.debug("REDUCE: Creating/Updating Plans", `ItemId: ${stItemInternalId}, plans: ${JSON.stringify(arrPlans)}`);
            
            for(let i = 0; i < arrPlans.length; i++){

                if(arrPlans[i].action === 'create'){
                    log.debug('REDUCE: Creating Plan', arrPlans[i]);
                    createPlans(stItemInternalId, arrPlans[i]);

                } else {
                    log.debug('REDUCE: Updating Plan', arrPlans[i]);
                    updatePlans(stItemInternalId, arrPlans[i]);
                }
            }

        } catch(e) {
            log.debug('ERROR in REDUCE: ', e.message);
        }      
    };
    exports.summarize = (summary) => {

    };
    //Get existing Warranty plan records for item
    const getExistingPlans = stItemId => {
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'custrecord_amp_item', operator: 'is', values:[stItemId]}));

        var arrColumns = [];
        arrColumns.push(search.createColumn({name: 'internalid'}));
        arrColumns.push(search.createColumn({name: 'custrecord_amp_warranty_extend_id'}));

        const arrSearchResults = util.search('customrecord_amp_warranty_plan', null, arrFilters, arrColumns);

        var objResults = {};
        for(var i = 0; i < arrSearchResults.length; i++) {
            var stExtendPlanId = arrSearchResults[i].getValue({name: 'custrecord_amp_warranty_extend_id'});
            objResults[stExtendPlanId] = arrSearchResults[i].id;
        }

        return objResults;

    };
    //Create plans
    const createPlans = (stItemInternalId, objPlan) => {

        //Create the warranty subrecord
        var objNewPlan = record.create({
            type:  'customrecord_amp_warranty_plan',
            isDynamic: true
        });
        objNewPlan.setValue({fieldId: 'custrecord_amp_item', value: stItemInternalId});
        objNewPlan.setValue({fieldId: 'custrecord_amp_warranty_price', value: parseFloat(objPlan.price / 100)});
        objNewPlan.setValue({fieldId: 'custrecord_amp_warranty_term', value: objPlan.contract.termLength});
        objNewPlan.setValue({fieldId: 'custrecord_amp_warranty_extend_id', value: objPlan.id});
        const stRecordId = objNewPlan.save();

        log.debug('REDUCE: New Plan Created', stRecordId);

        //Update item record status
        record.submitFields({
            type: 'serializedinventoryitem',
            id: stItemInternalId,
            values: {
                'custitem_amp_sync_status' : objStatus.LIVE
            }
        });
    };
    //Update existing plans
    const updatePlans = (stItemInternalId, objPlan) => {
        record.submitFields({
            type: 'customrecord_amp_warranty_plan',
            id: objPlan.warrantyId,
            values: {
                'custrecord_amp_warranty_price' : parseFloat(objPlan.price / 100),
                'custrecord_amp_warranty_term' : objPlan.contract.termLength
            }
        });
        log.debug('REDUCE: Existing Plan Updated', stItemInternalId);

        //Update item record status
        record.submitFields({
            type: 'serializedinventoryitem',
            id: stItemInternalId,
            values: {
                'custitem_amp_sync_status' : objStatus.LIVE
            }
        });
    };
    return exports;
});
 