/**
 *@description: 
 *    
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/task'
], (task) => {
    var exports = {};
    exports.afterSubmit = context => {
        const objNewRecord = context.newRecord;
       
        try {
            // var contractTask = task.create({
            //     taskType: task.TaskType.SCHEDULED_SCRIPT,
            //     scriptId: 'customscript_amp_create_contracts_ss',
            //     params: {
            //         'custparam_parameters' : {
            //             'custparam_so_id' : objNewRecord.id
            //         }
            //     }
            // });
            // contractTask.submit();
        } catch(e) {
            log.debug('Extend: Error Triggering Contract Job', JSON.stringify(e));
        }
    };
    return exports;
});