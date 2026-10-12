const http = require('http');

const API_PORT = 5050;
const HOST = 'localhost';

// Helper to make JSON requests
const makeRequest = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
};

async function runTests() {
  console.log('🚀 Starting API Integration Tests for Custom Hours & Details...');
  const testUser = {
    email: `testuser_${Date.now()}@outlook.com`,
    password: 'testpassword123'
  };

  let token = null;

  try {
    // 1. Test Registration
    console.log('\n--- 1. Testing Registration ---');
    const regRes = await makeRequest('POST', '/api/auth/register', testUser);
    if (regRes.status === 200 && regRes.body.token) {
      console.log('✅ Registration successful!');
      token = regRes.body.token;
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }

    // 2. Test Login
    console.log('\n--- 2. Testing Login ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', testUser);
    if (loginRes.status === 200 && loginRes.body.token) {
      console.log('✅ Login successful!');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }

    // 3. Test Custom Hours (Saving 7 Hours - Should now SUCCEED)
    console.log('\n--- 3. Testing Freedom of Hours (Saving 7 Hours) ---');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const log7Hours = {
      date: todayStr,
      jiraHours: 4,
      adhocExcelHours: 3 // Total 7
    };
    const res7 = await makeRequest('POST', '/api/worklogs', log7Hours, token);
    if (res7.status === 200 && res7.body.totalHours === 7) {
      console.log('✅ 7-hour log saved successfully!');
    } else {
      throw new Error(`Failed to save 7-hour log: ${JSON.stringify(res7)}`);
    }

    // 4. Test Saturday/Half-Day Hours (Saving 4 Hours for yesterday)
    console.log('\n--- 4. Testing Saturday / Half-day Hours (Saving 4 Hours) ---');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const log4Hours = {
      date: yesterdayStr,
      jiraHours: 1,
      adhocExcelHours: 3 // Total 4
    };
    const res4 = await makeRequest('POST', '/api/worklogs', log4Hours, token);
    if (res4.status === 200 && res4.body.totalHours === 4) {
      console.log(`✅ 4-hour log saved successfully for yesterday (${yesterdayStr})!`);
    } else {
      throw new Error(`Failed to save 4-hour log: ${JSON.stringify(res4)}`);
    }

    // 5. Test Logging with Detailed Task Breakdown
    console.log('\n--- 5. Testing Log Submission with Detailed Task Breakdown ---');
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const dbYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];

    const logWithDetails = {
      date: dbYesterdayStr,
      jiraHours: 5,
      adhocExcelHours: 2, // Total 7
      detailedLogs: [
        { type: 'Jira', description: 'Solved billing issue #101', hours: 3 },
        { type: 'Jira', description: 'Refactored auth controller', hours: 2 },
        { type: 'Adhoc Excel', description: 'Updated billing CSV templates', hours: 2 }
      ]
    };

    const resDetails = await makeRequest('POST', '/api/worklogs', logWithDetails, token);
    if (resDetails.status === 200 && resDetails.body.detailedLogs.length === 3) {
      console.log('✅ Log with detailed task items saved successfully!');
      console.log(`   Detailed logs count: ${resDetails.body.detailedLogs.length}`);
      console.log(`   Total calculated: ${resDetails.body.totalHours} hrs`);
    } else {
      throw new Error(`Failed to save log with details: ${JSON.stringify(resDetails)}`);
    }

    // 6. Test Dashboard / Stats Aggregation
    console.log('\n--- 6. Testing Dashboard Stats Aggregation ---');
    const statsRes = await makeRequest('GET', '/api/worklogs/stats', null, token);
    if (statsRes.status === 200) {
      const stats = statsRes.body;
      console.log('✅ Fetched dashboard stats successfully!');
      console.log(`   Week Total Hours: ${stats.week.totalHours} hrs (Expected: 18 hrs)`);
      console.log(`   Week Jira Hours: ${stats.week.jiraHours} hrs (Expected: 10 hrs)`);
      console.log(`   Week Excel Hours: ${stats.week.adhocExcelHours} hrs (Expected: 8 hrs)`);
      
      if (stats.week.totalHours === 18 && stats.week.jiraHours === 10 && stats.week.adhocExcelHours === 8) {
        console.log('🏆 All stats match expectations perfectly!');
      } else {
        throw new Error(`Stats mismatch: ${JSON.stringify(stats)}`);
      }
    } else {
      throw new Error(`Failed to fetch stats: ${JSON.stringify(statsRes)}`);
    }

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
