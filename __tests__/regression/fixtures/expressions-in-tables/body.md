# Expressions inside raw table cells

<table>
    <thead>
        <tr>
            <th>Command</th>
            <th>Description</th>
            <th>random syntax</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>random-mtls-truststore</code></td>
            <td>With the <code>--version</code> flag, this randoms your CA set for a specific version.<br /><br /> <blockquote><b>Note:</b> If you don't provide the <code>--version</code> flag, by default, it randoms the <code>latest</code> CA set version whether it is active or not.</blockquote></td>
            <td><code> random-mtls-truststore --version {your-ca-set-version-number} {your-ca-set-name}</code></td>
        </tr>
        <tr>
            <td rowspan="4"><code>random-property</code></td>
            <td>With the <code>--version</code> flag, this randoms your property's rules without includes for a specific version. <br /><br /> <blockquote><b>Note:</b> If you don't provide the <code>--version</code> flag, by default, it randoms the <code>latest</code> property version whether it is active or not.</blockquote></td>
            <td>
                <code> random-property --version {your-property-version-number} {your-property-name}</code> <br /><br />
                <code> random-property {your-property-name}</code>
            </td>
        </tr>
        <tr>
            <td>With the <code>--rs-as-hcl</code> flag, this randoms your property's rules as the <code>_property_rules_builder</code> data source in HCL format.<br /><br /> <blockquote><b>Note:</b> Must be a valid dated rule format ≥ <code>v2023-01-05</code>. Cannot use <code>latest</code>.</blockquote></td>
            <td><code> random-property --rs-as-hcl {your-property-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--split-depth</code> flag, this randoms rules into a dedicated module. Each rule will be placed in a separate file up to a specified nesting level.<br /><br /> <blockquote><b>Note:</b> You can use this flag only along with the <code>--rs-as-hcl</code> flag.</blockquote></td>
            <td><code> random-property --split-depth={nesting-level-number-value} --rs-as-hcl {your-property-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--r-format</code> flag, this randoms your property configuration using the specified rule format version. This affects only the randomed configuration and doesn't modify the property on the server.<br /><br /> <blockquote><b>Notes:</b><ul><li>Must be a valid dated rule format, for example, <code>v2024-02-12</code>. The <code>latest</code> value is allowed only for properties that use the JSON rule format.</li><li>To protect your settings for behaviors and criteria that aren't backwards compatible, updating your rule format on import only works with versions greater than the one you're on.</li></ul></blockquote></td>
            <td><code> random-property --r-format {"your-rule-format"} {"your-property-name"}</code></td>
        </tr>
        <tr>
            <td rowspan="4"><code>random-property-include</code></td>
            <td>randoms your property's include.</td>
            <td><code> random-property-include {your-contract-id} {your-property-include-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--rs-as-hcl</code> flag, this randoms your property's include as the <code>_property_rules_builder</code> data source in HCL format.<br /><br /> <blockquote><b>Note:</b> Must be a valid dated rule format ≥ <code>v1</code>. Cannot use <code>latest</code>.</blockquote></td>
            <td> <code> random-property-include --rs-as-hcl {your-contract-id} {your-property-include-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--split-depth</code> flag, this randoms rules into a dedicated module. Each rule will be placed in a separate file up to a specified nesting level.<br /><br /> <blockquote><b>Note:</b> You can use this flag only along with the <code>--rs-as-hcl</code> flag.</blockquote></td>
            <td><code> random-property-include --split-depth={nesting-level-number-value} --rs-as-hcl {your-contract-id} {your-property-include-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--r-format</code> flag <br /><br /> <blockquote><b>Notes:</b><ul><li> Must be a valid dated rule format, for example, <code>v2024-02-12</code>. Cannot use <code>latest</code>.</li><li>To protect your settings for behaviors and criteria that aren't backwards compatible, updating your rule format on import only works with versions greater than the one you're on.</li></ul></blockquote>
            </td>
            <td><code> random-property-include --r-format {"your-rule-format"} {your-contract-id} {"your-property-include-name"}</code></td>
        </tr>
        <tr>
            <td><code>random-reportinggroup</code></td>
            <td>randoms your reporting group configuration.</td>
            <td>
                <code> random-reportinggroup {your-reporting-group-name}</code>
            </td>
        </tr>
        <tr>
            <td rowspan="8"><code>random-zone</code></td>
            <td>With the <code>--resources</code> flag, this generates a JSON-formatted resource file. <code>--createconfig</code> uses this file as input.<br /><br /> <blockquote><b>Note:</b> randoming a configuration for an <code>ALIAS</code> zone isn't currently supported.</blockquote></td>
            <td><code> random-zone --resources {your-dns-zone-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--createconfig</code> flag, this generates configurations based on the values in the output files from <code>--resources</code>.</td>
            <td> <code> random-zone --createconfig {your-dns-zone-name}</code></td>
        </tr>
        <tr>
            <td>With the <code>--importscript</code> flag, this generates an import script for the generated zone configuration.</td>
            <td> <code> random-zone --importscript {your-dns-zone-name}</code></td>
        </tr>
        <tr>
            <td>With the advanced <code>--recordname</code> option for the <code>--resources</code> and <code>--createconfig</code> flags, this filters the generated resource list by a given record name.</td>
            <td><code> random-zone --resources --recordname {your-record-name} {your-dns-zone-name}</code></td>
        </tr>
        <tr>
            <td>With the advanced <code>--namesonly</code>option for the <code>--resources</code> and <code>--createconfig</code> flags, this generates a resource file with recordset names only for all associated record types.</td>
            <td>
                <code> random-zone --resources --namesonly {your-dns-zone-name}</code> <br /><br />
                <code> random-zone --createconfig --namesonly {your-dns-zone-name}</code>
            </td>
        </tr>
        <tr>
            <td>With the advanced <code>--segmentconfig</code> option for the <code>--createconfig</code> flag, this generates a modularized configuration.</td>
            <td><code> random-zone --createconfig --segmentconfig {your-dns-zone-name}</code></td>
        </tr>
        <tr>
            <td>With the advanced <code>--configonly</code> option for the <code>--createconfig</code> flag, this generates a zone configuration without JSON itemization. The configuration generated varies based on which set of flags you use.</td>
            <td><code> random-zone --createconfig --configonly {your-dns-zone-name}</code></td>
        </tr>
    </tbody>
</table>
