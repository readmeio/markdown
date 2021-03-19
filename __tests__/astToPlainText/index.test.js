const fs = require('fs');
const path = require('path');

const { astToPlainText, hast } = require('../../index');

describe('astToPlainText with tables', () => {
  it('includes all cells', () => {
    const text = `
  | Col. A  | Col. B  | Col. C  |
  |:-------:|:-------:|:-------:|
  | Cell A1 | Cell B1 | Cell C1 |
  | Cell A2 | Cell B2 | Cell C2 |
  | Cell A3 | Cell B3 | Cell C3 |`;

    expect(astToPlainText(hast(text))).toMatchInlineSnapshot(`
      "

      Col. A Col. B Col. CCell A1 Cell B1 Cell C1 Cell A2 Cell B2 Cell C2 Cell A3 Cell B3 Cell C3"
    `);
  });

  it('includes all cells for magicblock tables', () => {
    const text = fs.readFileSync(path.join(__dirname, './files/big-id-page.md'), { encoding: 'utf8' });

    expect(astToPlainText(hast(text))).toMatchInlineSnapshot(`
      "

      Component Environment Variable ValuesCache REDIS_PASSWORD 
      Password to connect to the Redis bigid-cache microservice. Set this variable if you are not using the default password. 
      See  System Overview  for more information. String Correlator CORRELATION_RECOVERY_SCHEDULER_FLAG 
      Set to  true  to automatically retry correlations when uncorrelated findings exist. Boolean true/false 
      Default:  true  (enabled) Logs ENABLE_VERBOSE_LOG 
      Set to  true  to unmask personal information in system logs, for debugging purposes. 
      Personal information in logs is masked by default, appearing as follows: 
       <first letter>****<last letter> 
      (always with four asterisks regardless of the length of the value) 
      This setting overrides  shouldPrintSensitiveData  custom parameter in data sources. Boolean true/false 
      Default:  false Orchestrator ORCHESTRATOR_URL_EXT 
      External URL of the BigID orchestrator service. String 
      Default:  blank Orchestrator RAPID_UNSTRUCTURED 
      _CORRELATION_ENABLED 
      Set to 'true' to enable superfast correlation processing for very large sets of unstructured data, in particular, when deploying multiple instances of orch2. Boolean true/false 
      Default:   false Scanner PREDICTION_CHUNK_SIZE 
      Minimum recommended number of files per batch of training documents for  Hyperscan . Integer 
      Default:  10000 Scanner SCAN_PARTS_ENABLED 
      Set to  true  to enable  Split Scans , a process that breaks scans into smaller processes that can run in parallel on multiple scanners Boolean true/false 
      Default:  true  (enabled) Scanner SCAN_RESULTS_QUERY_LIMIT 
      Set limit on number of rows returned per attribute per table by scanner queries, for performance optimization. Integer 
      Default:  10000 Scanner SCANNER_TEST_CONNECTION 
      _TINEOUT_SECONDS 
      Set timeout, in seconds, for scanner. Integer Scanner TIME_TO_FAILED_NOT_WORKING_SCANNERS 
      Set timeout, in seconds, to abort scan and set status to FAILED. Integer 
      Default:  1800 Scanner SCANNER_GROUP_NAME 
      Sets the group name for the scanner. String 
      Default:  blank UI DISPLAY_CHINA_REGULATIONS 
      Display Hong Kong, Macao, and Taiwan as regions of China in location dropdowns. Boolean true/false 
      Default:  false  (disabled) UI MAX_UPLOAD_LIMITATION 
      Set maximum size for uploaded files, in MB.  Any integer is valid, but upper limit set in nginx  default.conf  will not be exceeded. Integer 
      Default:  50 UI SHOW_ONLY_IDP_LOGIN 
      Set to  true  to block local login when  SSO  is active. Boolean true/false 
      Default:  true UI TOKEN_EXPIRATION_IN_MINUTES 
      Set period after login, in minutes, to log user out of BigID application. Integer 
      Default: 1440 UI TRUST_SELF_SIGNED_CERTS 
      Set to  true  to allow configuration of BigID with self-signed SSL certificate. Boolean true/false 
      Default:  true  (allowed) UI TZ 
      Time Zone.  See below. String 
      Default:  blank UI UI_IDLE_TIMEOUT_IN_MINUTES 
      Set User Interface session to expire after this period (in minutes) of inactivity.  User will be prompted to sign in again. Integer 
      Default:  15 Users USE_EXTENDED_PERMISSIONS 
      Set to  true  to enable OPS, CORP-ID, and IAM  Roles . Boolean true/false"
    `);
  });
});
