<ol>
  <li>
    <details>
      <summary>Authorization request</summary>

      ### 1. Authorization request

      ```json 0100 Request
      {
          "MESSAGE_TYPE": {
              "Message_Type": "0100",
              "Message_Desc": "Authorisation Request"
          },
          "SUMMARY": {
              "TID": "2237374892345000118",
              "Network": "MC",
          }
      }
      ```
      ```json 0100 Response
      {
          "Message_Type": "0110",
      }
      ```
    </details>
  </li>

  <li>
    <details>
      <summary>ATM withdrawal and reversal</summary>

      ### 2. ATM withdrawal and reversal

      ```json Request
      {
          "MESSAGE_TYPE": {
              "Message_Type": "0400",
              "Message_Desc": "Reversal Request"
          },
          "ISO_MSG": {
              "DE48": {
                  "1": "Z",
                  "80": "TV"
              },
          },
          "RULES": []

      }
      ```
      ```json Response
      {
          "DE11": "000071",
          "DE2": "818654321",
      }
      ```
    </details>
  </li>
</ol>
