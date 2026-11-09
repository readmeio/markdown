# HTMLBlock rendering

## Plain HTML inside an HTMLBlock (no script execution)

<HTMLBlock>{`
<div class="example-card">
  <h3>Plain HTML inside HTMLBlock</h3>
  <p>Content with <strong>nested tags</strong> and an entity: &amp;.</p>
</div>
`}</HTMLBlock>

Trailing paragraph after the HTMLBlock.

## Raw HTML table nested inside an HTMLBlock

<HTMLBlock>{`
<div class="rdmd-table">
    <div class="rdmd-table-inner">
        <table class="tiers-table">
            <tr>
                <th>Field</th>
                <th>Description</th>
                <th>Access</th>
            </tr>
            <tbody>
                <tr>
                    <td colspan="3" style="background-color: #D6EEEE;">
                        <p><b>Case identification and metadata</b></p>
                    </td>
                </tr>
                <tr>
                    <td><p><code>id</code></p></td>
                    <td><p>AML case ID</p></td>
                    <td><p>Non-sensitive</p></td>
                </tr>

                <tr>
                    <td colspan="3" style="background-color: #D6EEEE;">
                        <p><b>Applicant personal data</b></p>
                    </td>
                </tr>
                <tr>
                    <td><p><code>inputInfo.firstName</code></p></td>
                    <td><p>First name</p></td>
                    <td><p>Sensitive</p></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
`}</HTMLBlock>
