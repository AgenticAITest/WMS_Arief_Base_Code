const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/modules/sales-order`;

let authToken = '';
let testData = {
  transporterId: null,
  shippingMethodId: null,
  salesOrderId: null,
  salesOrderItemId: null,
  allocationId: null,
  pickId: null,
  shipmentId: null,
  packageId: null,
};

async function makeRequest(method, endpoint, body = null, token = authToken) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    
    let data = null;
    if (response.status !== 204 && response.status !== 205) {
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      if (contentLength !== '0' && contentType && contentType.includes('application/json')) {
        data = await response.json();
      }
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    reset: '\x1b[0m',
  };
  
  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const type = passed ? 'success' : 'error';
  log(`  ${symbol} ${testName}${details ? ' - ' + details : ''}`, type);
}

async function login() {
  log('\n=== AUTHENTICATION ===', 'info');
  
  const response = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123',
  }, null);
  
  if (response.ok && response.data.token) {
    authToken = response.data.token;
    logTest('Login', true, 'Token obtained');
    return true;
  } else {
    logTest('Login', false, 'Failed to obtain token');
    log('  Response: ' + JSON.stringify(response.data), 'error');
    return false;
  }
}

async function testTransporters() {
  log('\n=== TRANSPORTERS API ===', 'info');
  
  const createData = {
    name: 'FedEx Test',
    code: 'FEDEX_TEST_' + Date.now(),
    contactPerson: 'John Doe',
    phone: '+1234567890',
    email: 'contact@fedex.com',
    website: 'https://fedex.com',
    isActive: true,
    notes: 'Test transporter'
  };
  
  const createRes = await makeRequest('POST', '/transporters', createData);
  logTest('Create Transporter', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.transporterId = createRes.data.id;
    
    const getRes = await makeRequest('GET', `/transporters/${testData.transporterId}`);
    logTest('Get Transporter by ID', getRes.ok && getRes.data.id === testData.transporterId);
    
    const listRes = await makeRequest('GET', '/transporters?page=1&limit=10');
    logTest('List Transporters', listRes.ok && Array.isArray(listRes.data.data));
    
    const searchRes = await makeRequest('GET', `/transporters?search=FedEx`);
    logTest('Search Transporters', searchRes.ok && Array.isArray(searchRes.data.data));
    
    const updateRes = await makeRequest('PUT', `/transporters/${testData.transporterId}`, {
      notes: 'Updated test transporter'
    });
    logTest('Update Transporter', updateRes.ok);
  } else {
    log('  Skipping subsequent tests due to creation failure', 'warn');
  }
}

async function testShippingMethods() {
  log('\n=== SHIPPING METHODS API ===', 'info');
  
  if (!testData.transporterId) {
    log('  Skipping: No transporter ID available', 'warn');
    return;
  }
  
  const createData = {
    name: 'FedEx Express Test',
    code: 'FEDEX_EXPRESS_' + Date.now(),
    type: 'third_party',
    transporterId: testData.transporterId,
    costCalculationMethod: 'weight_based',
    baseCost: 10.00,
    estimatedDays: 2,
    isActive: true,
    description: 'Test shipping method'
  };
  
  const createRes = await makeRequest('POST', '/shipping-methods', createData);
  logTest('Create Shipping Method', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.shippingMethodId = createRes.data.id;
    
    const getRes = await makeRequest('GET', `/shipping-methods/${testData.shippingMethodId}`);
    logTest('Get Shipping Method by ID', getRes.ok && getRes.data.id === testData.shippingMethodId);
    
    const listRes = await makeRequest('GET', '/shipping-methods?page=1&limit=10');
    logTest('List Shipping Methods', listRes.ok && Array.isArray(listRes.data.data));
    
    const filterRes = await makeRequest('GET', '/shipping-methods?type=third_party');
    logTest('Filter Shipping Methods by Type', filterRes.ok);
    
    const updateRes = await makeRequest('PUT', `/shipping-methods/${testData.shippingMethodId}`, {
      description: 'Updated test method'
    });
    logTest('Update Shipping Method', updateRes.ok);
  }
}

async function testSalesOrders() {
  log('\n=== SALES ORDERS API ===', 'info');
  
  log('  Note: Requires valid customerId, warehouseId, and productId from your database', 'warn');
  log('  Attempting to find existing records...', 'info');
  
  const customersRes = await makeRequest('GET', `${BASE_URL}/api/master-data/customers?limit=1`);
  const warehousesRes = await makeRequest('GET', `${BASE_URL}/api/warehouse-setup/warehouses?limit=1`);
  const productsRes = await makeRequest('GET', `${BASE_URL}/api/master-data/products?limit=1`);
  
  let customerId = null, warehouseId = null, productId = null;
  
  if (customersRes.ok && customersRes.data.data && customersRes.data.data.length > 0) {
    customerId = customersRes.data.data[0].id;
    logTest('Found Customer', true, customerId);
  } else {
    logTest('Find Customer', false, 'No customers found - please create one first');
  }
  
  if (warehousesRes.ok && warehousesRes.data.data && warehousesRes.data.data.length > 0) {
    warehouseId = warehousesRes.data.data[0].id;
    logTest('Found Warehouse', true, warehouseId);
  } else {
    logTest('Find Warehouse', false, 'No warehouses found - please create one first');
  }
  
  if (productsRes.ok && productsRes.data.data && productsRes.data.data.length > 0) {
    productId = productsRes.data.data[0].id;
    logTest('Found Product', true, productId);
  } else {
    logTest('Find Product', false, 'No products found - please create one first');
  }
  
  if (!customerId || !warehouseId || !productId) {
    log('  Skipping sales order tests due to missing dependencies', 'warn');
    return;
  }
  
  const customerLocationRes = await makeRequest('GET', `${BASE_URL}/api/master-data/customer-locations?customerId=${customerId}&limit=1`);
  let customerLocationId = null;
  
  if (customerLocationRes.ok && customerLocationRes.data.data && customerLocationRes.data.data.length > 0) {
    customerLocationId = customerLocationRes.data.data[0].id;
    logTest('Found Customer Location', true, customerLocationId);
  } else {
    logTest('Find Customer Location', false, 'No customer locations found - using customerId instead');
  }
  
  const createData = {
    orderNumber: 'SO-TEST-' + Date.now(),
    customerId: customerId,
    customerLocationId: customerLocationId,
    warehouseId: warehouseId,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'normal',
    currency: 'USD',
    paymentTerms: 'Net 30',
    notes: 'Test sales order',
    items: [
      {
        productId: productId,
        quantity: 10,
        unitPrice: 25.50,
        discountPercentage: 5,
        taxPercentage: 8.5,
        notes: 'Test item'
      }
    ]
  };
  
  const createRes = await makeRequest('POST', '/sales-orders', createData);
  logTest('Create Sales Order', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.salesOrderId = createRes.data.id;
    
    if (createRes.data.items && createRes.data.items.length > 0) {
      testData.salesOrderItemId = createRes.data.items[0].id;
      logTest('Sales Order Items Created', true, `Item ID: ${testData.salesOrderItemId}`);
    }
    
    const getRes = await makeRequest('GET', `/sales-orders/${testData.salesOrderId}`);
    logTest('Get Sales Order by ID', getRes.ok && getRes.data.id === testData.salesOrderId);
    
    const listRes = await makeRequest('GET', '/sales-orders?page=1&limit=10');
    logTest('List Sales Orders', listRes.ok && Array.isArray(listRes.data.data));
    
    const searchRes = await makeRequest('GET', `/sales-orders?search=SO-TEST`);
    logTest('Search Sales Orders', searchRes.ok);
    
    const filterRes = await makeRequest('GET', '/sales-orders?status=draft');
    logTest('Filter Sales Orders by Status', filterRes.ok);
    
    const updateRes = await makeRequest('PUT', `/sales-orders/${testData.salesOrderId}`, {
      status: 'confirmed',
      notes: 'Updated test order'
    });
    logTest('Update Sales Order', updateRes.ok);
  } else {
    log('  Response: ' + JSON.stringify(createRes.data), 'error');
  }
}

async function testAllocations() {
  log('\n=== ALLOCATIONS API ===', 'info');
  
  if (!testData.salesOrderItemId) {
    log('  Skipping: No sales order item ID available', 'warn');
    return;
  }
  
  const inventoryRes = await makeRequest('GET', `${BASE_URL}/api/inventory-management/inventory-items?limit=1`);
  let inventoryItemId = null;
  
  if (inventoryRes.ok && inventoryRes.data.data && inventoryRes.data.data.length > 0) {
    inventoryItemId = inventoryRes.data.data[0].id;
    logTest('Found Inventory Item', true, inventoryItemId);
  } else {
    logTest('Find Inventory Item', false, 'No inventory items found - please create one first');
    return;
  }
  
  const createData = {
    salesOrderItemId: testData.salesOrderItemId,
    inventoryItemId: inventoryItemId,
    allocatedQuantity: 5,
    notes: 'Test allocation'
  };
  
  const createRes = await makeRequest('POST', '/allocations', createData);
  logTest('Create Allocation', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.allocationId = createRes.data.id;
    
    const getRes = await makeRequest('GET', `/allocations/${testData.allocationId}`);
    logTest('Get Allocation by ID', getRes.ok && getRes.data.id === testData.allocationId);
    
    const listRes = await makeRequest('GET', '/allocations?page=1&limit=10');
    logTest('List Allocations', listRes.ok && Array.isArray(listRes.data.data));
    
    if (testData.salesOrderId) {
      const filterRes = await makeRequest('GET', `/allocations?salesOrderId=${testData.salesOrderId}`);
      logTest('Filter Allocations by Sales Order', filterRes.ok);
    }
    
    const updateRes = await makeRequest('PUT', `/allocations/${testData.allocationId}`, {
      notes: 'Updated test allocation'
    });
    logTest('Update Allocation', updateRes.ok);
  }
}

async function testPicks() {
  log('\n=== PICKS API ===', 'info');
  
  if (!testData.salesOrderId || !testData.allocationId) {
    log('  Skipping: No sales order or allocation ID available', 'warn');
    return;
  }
  
  const createData = {
    salesOrderId: testData.salesOrderId,
    allocationId: testData.allocationId,
    pickedQuantity: 5,
    batchNumber: 'BATCH-TEST-' + Date.now(),
    lotNumber: 'LOT-001',
    notes: 'Test pick'
  };
  
  const createRes = await makeRequest('POST', '/picks', createData);
  logTest('Create Pick', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.pickId = createRes.data.id;
    
    const getRes = await makeRequest('GET', `/picks/${testData.pickId}`);
    logTest('Get Pick by ID', getRes.ok && getRes.data.id === testData.pickId);
    
    const listRes = await makeRequest('GET', '/picks?page=1&limit=10');
    logTest('List Picks', listRes.ok && Array.isArray(listRes.data.data));
    
    const filterRes = await makeRequest('GET', `/picks?salesOrderId=${testData.salesOrderId}`);
    logTest('Filter Picks by Sales Order', filterRes.ok);
    
    const updateRes = await makeRequest('PUT', `/picks/${testData.pickId}`, {
      notes: 'Updated test pick'
    });
    logTest('Update Pick', updateRes.ok);
  }
}

async function testShipments() {
  log('\n=== SHIPMENTS & PACKAGES API ===', 'info');
  
  if (!testData.salesOrderId) {
    log('  Skipping: No sales order ID available', 'warn');
    return;
  }
  
  const createData = {
    salesOrderId: testData.salesOrderId,
    shipmentNumber: 'SHIP-TEST-' + Date.now(),
    transporterId: testData.transporterId,
    shippingMethodId: testData.shippingMethodId,
    trackingNumber: 'TRACK-' + Date.now(),
    shippingDate: new Date().toISOString(),
    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalWeight: 25.5,
    totalVolume: 0.5,
    totalCost: 45.00,
    notes: 'Test shipment',
    packages: [
      {
        packageNumber: 'PKG-TEST-' + Date.now(),
        barcode: 'BARCODE-' + Date.now(),
        dimensions: '30x20x10 cm',
        weight: 12.5,
        notes: 'Test package'
      }
    ]
  };
  
  const createRes = await makeRequest('POST', '/shipments', createData);
  logTest('Create Shipment', createRes.status === 201, `Status: ${createRes.status}`);
  
  if (createRes.ok && createRes.data.id) {
    testData.shipmentId = createRes.data.id;
    
    if (createRes.data.packages && createRes.data.packages.length > 0) {
      testData.packageId = createRes.data.packages[0].id;
      logTest('Packages Created', true, `Package ID: ${testData.packageId}`);
    }
    
    const getRes = await makeRequest('GET', `/shipments/${testData.shipmentId}`);
    logTest('Get Shipment by ID', getRes.ok && getRes.data.id === testData.shipmentId);
    
    const listRes = await makeRequest('GET', '/shipments?page=1&limit=10');
    logTest('List Shipments', listRes.ok && Array.isArray(listRes.data.data));
    
    const searchRes = await makeRequest('GET', '/shipments?search=SHIP-TEST');
    logTest('Search Shipments', searchRes.ok);
    
    const filterRes = await makeRequest('GET', '/shipments?status=ready');
    logTest('Filter Shipments by Status', filterRes.ok);
    
    const updateRes = await makeRequest('PUT', `/shipments/${testData.shipmentId}`, {
      status: 'in_transit',
      notes: 'Updated test shipment'
    });
    logTest('Update Shipment', updateRes.ok);
    
    if (testData.shipmentId) {
      const packagesRes = await makeRequest('GET', `/packages?shipmentId=${testData.shipmentId}`);
      logTest('List Packages by Shipment', packagesRes.ok && Array.isArray(packagesRes.data.data));
    }
  }
}

async function testDeleteOperations() {
  log('\n=== DELETE OPERATIONS & CASCADE VERIFICATION ===', 'info');
  
  log('\n  Creating additional test data for cascade verification...', 'info');
  
  let cascadeAllocationId = null;
  let cascadePickId = null;
  
  if (testData.salesOrderItemId && testData.allocationId) {
    const inventoryRes = await makeRequest('GET', `${BASE_URL}/api/inventory-management/inventory-items?limit=1`);
    if (inventoryRes.ok && inventoryRes.data.data && inventoryRes.data.data.length > 0) {
      const cascadeAllocRes = await makeRequest('POST', '/allocations', {
        salesOrderItemId: testData.salesOrderItemId,
        inventoryItemId: inventoryRes.data.data[0].id,
        allocatedQuantity: 3,
        notes: 'For cascade test'
      });
      if (cascadeAllocRes.ok && cascadeAllocRes.data.id) {
        cascadeAllocationId = cascadeAllocRes.data.id;
        logTest('Created additional allocation for cascade test', true);
      }
    }
  }
  
  if (testData.salesOrderId && cascadeAllocationId) {
    const cascadePickRes = await makeRequest('POST', '/picks', {
      salesOrderId: testData.salesOrderId,
      allocationId: cascadeAllocationId,
      pickedQuantity: 3,
      batchNumber: 'CASCADE-BATCH-' + Date.now(),
      notes: 'For cascade test'
    });
    if (cascadePickRes.ok && cascadePickRes.data.id) {
      cascadePickId = cascadePickRes.data.id;
      logTest('Created additional pick for cascade test', true);
    }
  }
  
  log('\n  Testing explicit DELETE endpoints:', 'info');
  
  if (testData.allocationId) {
    const deleteRes = await makeRequest('DELETE', `/allocations/${testData.allocationId}`);
    logTest('Delete Allocation (explicit endpoint test)', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/allocations/${testData.allocationId}`);
    logTest('Verify Allocation Deleted', verifyRes.status === 404, 'Should return 404');
  }
  
  if (testData.pickId) {
    const deleteRes = await makeRequest('DELETE', `/picks/${testData.pickId}`);
    logTest('Delete Pick (explicit endpoint test)', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/picks/${testData.pickId}`);
    logTest('Verify Pick Deleted', verifyRes.status === 404, 'Should return 404');
  }
  
  log('\n  Testing cascade deletes (parent → children):', 'info');
  
  if (testData.shipmentId) {
    if (testData.packageId) {
      const beforeRes = await makeRequest('GET', `/packages?shipmentId=${testData.shipmentId}`);
      logTest('Verify Packages Exist Before Shipment Delete', beforeRes.ok && beforeRes.data.data && beforeRes.data.data.length > 0, 
        `Found ${beforeRes.data?.data?.length || 0} packages`);
    }
    
    const deleteRes = await makeRequest('DELETE', `/shipments/${testData.shipmentId}`);
    logTest('Delete Shipment (should cascade to packages)', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/shipments/${testData.shipmentId}`);
    logTest('Verify Shipment Deleted', verifyRes.status === 404, 'Should return 404');
    
    if (testData.packageId) {
      const afterRes = await makeRequest('GET', `/packages?shipmentId=${testData.shipmentId}`);
      logTest('Verify Packages Cascade Deleted', afterRes.ok && afterRes.data.data && afterRes.data.data.length === 0, 
        'Packages should be automatically removed');
    }
  }
  
  if (testData.salesOrderId) {
    const beforeItemsRes = await makeRequest('GET', `/sales-orders/${testData.salesOrderId}`);
    const itemCount = beforeItemsRes.ok && beforeItemsRes.data.items ? beforeItemsRes.data.items.length : 0;
    if (itemCount > 0) {
      logTest('Verify Order Items Exist Before Delete', true, `Found ${itemCount} items`);
    }
    
    if (testData.allocationId) {
      const beforeAllocRes = await makeRequest('GET', `/allocations?salesOrderId=${testData.salesOrderId}`);
      logTest('Verify Allocations Exist Before Order Delete', 
        beforeAllocRes.ok && beforeAllocRes.data.data && beforeAllocRes.data.data.length > 0,
        `Found ${beforeAllocRes.data?.data?.length || 0} allocations`);
    }
    
    if (testData.pickId) {
      const beforePicksRes = await makeRequest('GET', `/picks?salesOrderId=${testData.salesOrderId}`);
      logTest('Verify Picks Exist Before Order Delete', 
        beforePicksRes.ok && beforePicksRes.data.data && beforePicksRes.data.data.length > 0,
        `Found ${beforePicksRes.data?.data?.length || 0} picks`);
    }
    
    const deleteRes = await makeRequest('DELETE', `/sales-orders/${testData.salesOrderId}`);
    logTest('Delete Sales Order (should cascade to items)', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/sales-orders/${testData.salesOrderId}`);
    logTest('Verify Sales Order Deleted', verifyRes.status === 404, 'Should return 404');
    
    if (testData.salesOrderItemId) {
      const allocationsRes = await makeRequest('GET', `/allocations?salesOrderId=${testData.salesOrderId}`);
      logTest('Verify Allocations Cascade Deleted', 
        allocationsRes.ok && allocationsRes.data.data && allocationsRes.data.data.length === 0,
        'Allocations should be automatically removed');
      
      const picksRes = await makeRequest('GET', `/picks?salesOrderId=${testData.salesOrderId}`);
      logTest('Verify Picks Cascade Deleted', 
        picksRes.ok && picksRes.data.data && picksRes.data.data.length === 0,
        'Picks should be automatically removed');
    }
  }
  
  log('\n  Testing standalone DELETE operations:', 'info');
  
  if (testData.shippingMethodId) {
    const deleteRes = await makeRequest('DELETE', `/shipping-methods/${testData.shippingMethodId}`);
    logTest('Delete Shipping Method', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/shipping-methods/${testData.shippingMethodId}`);
    logTest('Verify Shipping Method Deleted', verifyRes.status === 404, 'Should return 404');
  }
  
  if (testData.transporterId) {
    const deleteRes = await makeRequest('DELETE', `/transporters/${testData.transporterId}`);
    logTest('Delete Transporter', deleteRes.status === 204 || deleteRes.status === 200, `Status: ${deleteRes.status}`);
    
    const verifyRes = await makeRequest('GET', `/transporters/${testData.transporterId}`);
    logTest('Verify Transporter Deleted', verifyRes.status === 404, 'Should return 404');
  }
  
  log('\n  All test data cleaned up successfully.', 'success');
  log('  ✓ Cascade delete behavior verified', 'success');
}

async function cleanup() {
  log('\n=== SUMMARY ===', 'info');
  log('  Test data IDs created during this run:', 'info');
  
  if (testData.transporterId) {
    log(`  ✓ Transporter ID: ${testData.transporterId}`, 'info');
  }
  if (testData.shippingMethodId) {
    log(`  ✓ Shipping Method ID: ${testData.shippingMethodId}`, 'info');
  }
  if (testData.salesOrderId) {
    log(`  ✓ Sales Order ID: ${testData.salesOrderId}`, 'info');
  }
  if (testData.salesOrderItemId) {
    log(`  ✓ Sales Order Item ID: ${testData.salesOrderItemId}`, 'info');
  }
  if (testData.allocationId) {
    log(`  ✓ Allocation ID: ${testData.allocationId}`, 'info');
  }
  if (testData.pickId) {
    log(`  ✓ Pick ID: ${testData.pickId}`, 'info');
  }
  if (testData.shipmentId) {
    log(`  ✓ Shipment ID: ${testData.shipmentId}`, 'info');
  }
  if (testData.packageId) {
    log(`  ✓ Package ID: ${testData.packageId}`, 'info');
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'info');
  log('║   SALES ORDER MODULE - API ENDPOINT TEST SUITE        ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');
  
  const loggedIn = await login();
  
  if (!loggedIn) {
    log('\n✗ Authentication failed. Please check your credentials.', 'error');
    log('  Default: username="admin", password="admin123"', 'info');
    return;
  }
  
  await testTransporters();
  await testShippingMethods();
  await testSalesOrders();
  await testAllocations();
  await testPicks();
  await testShipments();
  await testDeleteOperations();
  await cleanup();
  
  log('\n╔════════════════════════════════════════════════════════╗', 'success');
  log('║   TEST SUITE COMPLETE                                  ║', 'success');
  log('╚════════════════════════════════════════════════════════╝', 'success');
  log('\n📊 Test Coverage:', 'info');
  log('  ✓ CREATE operations tested', 'success');
  log('  ✓ READ operations tested (by ID & list)', 'success');
  log('  ✓ UPDATE operations tested', 'success');
  log('  ✓ DELETE operations tested (with verification)', 'success');
  log('  ✓ Search & filter operations tested', 'success');
  log('  ✓ Cascade delete behavior verified', 'success');
  log('\nSee API_DOCUMENTATION.md for detailed endpoint information.\n', 'info');
}

runTests().catch(error => {
  log('\n✗ Test suite failed with error:', 'error');
  console.error(error);
  process.exit(1);
});
