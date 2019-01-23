

var assert = require('assert');
const Web3 = require('web3');

var LeasableCarArtifact = artifacts.require("LeasableCar");
var LeaseAgreementArtifact = artifacts.require("LeaseAgreement");

async function create_test_agreement(the_car, driver_uid) {
    var start_timestamp = 1543838400;
    var end_timestamp = 1544356799;
    return create_agreement(the_car, start_timestamp, end_timestamp, driver_uid)
}

async function create_agreement(the_car, start_timestamp, end_timestamp, driver_uid) {
    var tx = await the_car.
    requestContractDraft(start_timestamp, end_timestamp, 
        {from: driver_uid});
    var agreement_uid = tx.logs[0].args.contractAddress;
    const agreement_promise = LeaseAgreementArtifact.at(agreement_uid);
    // Trying to await for the .at() call still returns a promise
    // we have to return a promise and await at the function call.
    return agreement_promise;
}

contract('TestSignAgreement', async function(accounts) {

    var car1;
    var car1_uid;
    // var car1_agreement;

    var car_owner_uid = accounts[0];
    var driver_uid = accounts[1];
    var driver_uid = accounts[2];
    var driver_uid = accounts[3];
    var driver_uid = accounts[4];
    var driver_uid = accounts[5];
    var some_other_account = accounts[8]

    var g = 4712388;
    var gp = 100000000000;

    before(async function() {
        var daily_rate = web3.utils.toWei(0.5+'');
        car1 = await LeasableCarArtifact
            .new('VIN1231', '2019', 'Audi', 'S4', 'Blue', daily_rate, 
            {from: car_owner_uid, gas: g, gasPrice: gp}
        );
        car1_uid = car1.address
    });

    it("Checking driverSign with exact deposit amount...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 0, "Agreement should be in Created(0) state!");
            
        var deposit_required = await car1_agreement.driver_deposit_required.call();
        deposit_in = deposit_required;
        var tx = await car1_agreement.
            driverSign({from: driver_uid, value: deposit_in});

        assert.equal(tx.logs.length, 1, "driverSign with exact deposit should only have 1 event!");
        assert.ok(tx.logs[0].args, "No args in tx!");
        assert.equal(tx.logs[0].event, "DriverSigned", "No DriverSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "DriverSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "DriverSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toString(), deposit_in.toString(), "DriverSigned deposit amount in tx response is bad!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount.toString(), deposit_in.toString(), "Driver depoist amount is not right!");

        var driver_balance_amount = await car1_agreement.driver_balance.call();
        assert.equal(driver_balance_amount, 0, "Driver balance amount should be 0 after exact deposit!");

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 1, "Agreement should be in PartiallySigned(1) state!");

    });

    it("Checking driverSign with extra deposit amount...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);      

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 0, "Agreement should be in Created(0) state!");

        var deposit_required = await car1_agreement.driver_deposit_required.call();
        // putting in extra $
        var deposit_in = deposit_required * 1.5;
        var tx = await car1_agreement.
            driverSign({from: driver_uid, value: deposit_in});

        assert.equal(tx.logs.length, 2, "driverSign with extra deposit should have 2 events!");

        assert.ok(tx.logs[0].args, "No args in tx[0]!");
        assert.equal(tx.logs[0].event, "DriverSigned", "No DriverSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "DriverSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "DriverSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toString(), deposit_required.toString(), "DriverSigned deposit amount is bad!");

        assert.ok(tx.logs[1].args, "No args in tx[1]!");
        assert.equal(tx.logs[1].event, "DriverBalanceUpdated", "No DriverBalanceUpdated event emitted!");
        assert.equal(tx.logs[1].args.the_car, car1_uid, "DriverBalanceUpdated car_uid is bad!");
        assert.equal(tx.logs[1].args.the_driver, driver_uid, "DriverBalanceUpdated driver_uid is bad!");
        var expected_balance = deposit_in - deposit_required;
        assert.equal(tx.logs[1].args.new_balance.toString(), expected_balance.toString(), "DriverBalanceUpdated baalnce amount is bad!");

        var driver_deposit_amount = await car1_agreement.driver_deposit_amount.call();
        assert.equal(driver_deposit_amount.toString(), deposit_required.toString(), "Driver deposit amount is not right!");

        var driver_balance_amount = await car1_agreement.driver_balance.call();
        assert.equal(driver_balance_amount.toString(), expected_balance.toString(), "Driver balance amount is not right!");

    });

    it("Checking driverSign require() conditions...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);                          
        var deposit_required = await car1_agreement.driver_deposit_required.call();

        // Check min deposit required
        // putting in less than required $
        var deposit_in = deposit_required * 0.5;
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Should not be able to give low driver deposit!")

        deposit_in = deposit_required;
        // Check only driver can sign
        // contract was created by driver_uid but we will try to depoist from another account
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                driverSign({from: some_other_account, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Some other driver should not be able to sign and deposit as the driver!")

        try {
            var tx = await car1_agreement.
                driverSign({from: car_owner_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Owner should not be able to sign and deposit as the driver!")

        // Check double sign & deposit
        var error_caught = false;
        var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        // try to depoit again
        try {
            var tx = await car1_agreement.
                driverSign({from: driver_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Cannot to driver sign and deposit again!")
    });

    it("Checking ownerSign require() conditions...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);

        var agreement_state = await car1_agreement.agreement_state.call();
        assert.equal(agreement_state.toNumber(), 0, "Agreement should be in Created(0) state!");

        var deposit_required = await car1_agreement.owner_deposit_required.call();

        // Check min deposit required
        // putting in less than required $
        var deposit_in = deposit_required * 0.5;
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                ownerSign({from: car_owner_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Should not be able to give low owner deposit!")


        // Check only owner can sign
        // contract was created for a car owned by car_owner_uid but we will try to depoist from another account
        deposit_in = deposit_required;
        var error_caught = false;
        try {
            var tx = await car1_agreement.
                ownerSign({from: some_other_account, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Some other driver should not be able to sign and deposit the as car owner!")

        try {
            var tx = await car1_agreement.
                ownerSign({from: driver_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Driver should not be able to sign and deposit the as car owner!")

        // 
        // Check double sign & deposit
        // 
        var error_caught = false;
        var tx = await car1_agreement.
                ownerSign({from: car_owner_uid, value: deposit_in});
        // try to deposit again
        try {
            var tx = await car1_agreement.
                ownerSign({from: car_owner_uid, value: deposit_in});
        } catch(error) {
            error_caught = true;
        }
        assert.ok(error_caught === true, "Cannot to owner sign and deposit again!")


    });

    it("Checking ownerSign with exact deposit amount...", async function() {

        const car1_agreement = await create_test_agreement(car1, driver_uid);
            
        var deposit_required = await car1_agreement.owner_deposit_required.call();
        // deposit_required = deposit_required.toNumber();
        deposit_in = deposit_required;
        var tx = await car1_agreement.
            ownerSign({from: car_owner_uid, value: deposit_in});

        assert.equal(tx.logs.length, 1, "ownerSign with exact deposit should only have 1 event!");
        assert.ok(tx.logs[0].args, "No args in tx!");
        assert.equal(tx.logs[0].event, "OwnerSigned", "No OwnerSigned event emitted!");
        assert.equal(tx.logs[0].args.the_car, car1_uid, "OwnerSigned car_uid is bad!");
        assert.equal(tx.logs[0].args.the_driver, driver_uid, "OwnerSigned driver_uid is bad!");
        assert.equal(tx.logs[0].args.deposit_amount.toString(), deposit_in.toString(), "OwnerSigned deposit amount in tx response is bad!");

        var owner_deposit_amount = await car1_agreement.owner_deposit_amount.call();
        assert.equal(owner_deposit_amount.toString(), deposit_in.toString(), "Owner deposit amount is not right!");

        var car_balance_amount = await car1_agreement.car_balance.call();
        assert.equal(car_balance_amount.toString(), "0", "Car balance amount should be 0 after exact deposit!");

    });

    // it("Checking driverSign ...", async function() {
    // });
});
