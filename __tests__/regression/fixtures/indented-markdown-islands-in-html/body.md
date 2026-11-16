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

<div class="content-card-container">
  {/* Card 1 */}
  <a href="invoices" class="content-card">
    <div class="content-card-content">

      <i class="far fa-file-invoice"></i>
      <span>
        <h3>How to View and Download Invoices</h3>
        <p>Access detailed invoices for VoIP, DID numbers, and subscriptions, and download them in PDF format</p>
      </span>
    </div>
  </a>
</div>
