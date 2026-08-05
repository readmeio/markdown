# Style and JSX Expressions

## HTML in JSX expressions should get rendered and also applying inline styles

<style>{`.note { color: teal; }`}</style>

<div className="notes">
  {[{ text: "Hello", detail: "World" }].map((item, i) => (
    <p key={i} className="note">
      {item.text}
      <div className="detail">{item.detail}</div>
    </p>
  ))}
</div>

## Customer doc with invalid HTML created in expressions

<style>
  {`
        .mf-grid-final {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(240px, 1fr)) !important;
          gap: 24px;
          margin-bottom: 56px;

          font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          color: rgb(48, 53, 58);
          font-size: 15px;
          line-height: 22.5px;
        }

        .mf-card-link-final {
          text-decoration: none !important;
          color: inherit !important;
          display: block;
          height: 100%;
        }

        .mf-card-final {
          padding: 22px !important;
          border: 1px solid #ececec !important;
          border-radius: 14px !important;
          background: #fff !important;
          transition: all 0.2s ease;
          text-align: left !important;
          height: 100%;
        }

        .mf-card-final:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        }

        .mf-inner-final {
          display: grid !important;
          grid-template-columns: 30px 1fr !important;
          column-gap: 12px !important;
          row-gap: 12px !important;
          align-items: center !important;
        }

        .mf-icon-final {
          grid-column: 1;
          grid-row: 1;
          width: 22px;
          height: 22px;
          object-fit: contain;
          display: block;
        }

        .mf-title-final {
          grid-column: 2;
          grid-row: 1;
          margin: 0 !important;
          font-size: 18px;
          font-weight: 600;
          line-height: 1.3;
        }

        .mf-list-final {
          grid-column: 1 / 3;
          grid-row: 2;
          margin: 0 !important;
          padding: 0 !important;
          list-style: none !important;
        }

        .mf-list-final li {
          display: grid !important;
          grid-template-columns: 30px 1fr !important;
          column-gap: 12px !important;
          margin-bottom: 6px;
        }

        .mf-list-final li::before {
          content: "•";
          grid-column: 1;
          justify-self: center;
          font-size: 20px;
          line-height: 22.5px;
        }

        .mf-list-final a {
          grid-column: 2;
          color: inherit;
          text-decoration: none;
          position: relative;
          z-index: 2;
        }

        .mf-list-final a:hover {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .mf-grid-final {
            grid-template-columns: 1fr !important;
          }
        }
      `}
</style>

<div className="mf-grid-final">
  {[
        {
          icon: "https://example.com/icons/alpha.png",
          title: "Alpha Module",
          cardUrl: "https://example.com/docs/alpha-module",
          items: [
            {
              label: "Cross-tenant alpha search",
              url: "https://example.com"
            },
          ]
        },
        {
          icon: "https://example.com/icons/beta.png",
          title: "Beta Module",
          cardUrl: "https://example.com/docs/beta-module",
          items: [
            {
              label: "Copy beta items across tenants",
              url: "https://example.com"
            },
          ]
        }
      ].map((item, i) => (
        <a
          key={i}
          href={item.cardUrl}
          className="mf-card-link-final"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="mf-card-final">
            <div className="mf-inner-final">
              <img src={item.icon} alt="" className="mf-icon-final" />

              <h3 className="mf-title-final">{item.title}</h3>

              <ul className="mf-list-final">
                {item.items.map((entry, idx) => (
                  <li key={idx}>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </a>
      ))}
</div>

<style>
  {`
      .config-section {
        background: #f4f6f8;
        padding: 40px 24px;
        border-radius: 20px;
        margin-bottom: 48px;

        font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont,
          "Helvetica Neue", Arial, sans-serif;
        color: rgb(48, 53, 58);
      }

      .config-inner {
        max-width: 1100px;
        margin: 0 auto;
      }

      .config-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* ✅ Jetzt 3 Spalten */
        gap: 24px;
      }

      .config-card {
        display: block;
        padding: 22px;
        border: 1px solid #e7eaf0;
        border-radius: 16px;
        background: #fff;
        transition: all 0.2s ease;
        cursor: pointer;

        text-decoration: none !important;
        color: inherit !important;
      }

      .config-card * {
        text-decoration: none !important;
        color: inherit !important;
      }

      .config-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
        border-color: #d7dce5;
      }

      .config-title {
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 700;
      }

      .config-text {
        margin: 0;
        font-size: 14px;
        line-height: 20px;
        color: #5f6670;
      }

      @media (max-width: 900px) {
        .config-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 700px) {
        .config-grid {
          grid-template-columns: 1fr;
        }
      }
    `}
</style>

<section className="config-section">
  <div className="config-inner">
    <div className="config-grid">
      {[
              {
                title: "Random Topic",
                text: "Random Text",
                link: "https://example.com/docs/topic-areas",
              },
              {
                title: "Random Topic 2",
                text: "Random Text 2",
                link: "https://example.com/docs/campaign-types",
              },
            ].map((item, i) => (
              <a
                key={i}
                href={item.link}
                className="config-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <h3 className="config-title">{item.title}</h3>
                <p className="config-text">{item.text}</p>
              </a>
            ))}
    </div>
  </div>
</section>


## Customer doc with complex `<style>` blocks

<style>
  {`
      .ems-grid-fix {
        display: grid;
        grid-template-columns: repeat(3, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 36px;

        font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        color: rgb(48, 53, 58);
      }

      .ems-card-fix {
        padding: 22px;
        border: 1px solid #ececec;
        border-radius: 14px;
        background: #fff;
      }

      .ems-card-fix:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.08);
      }

      .ems-row-fix {
        display: grid;
        grid-template-columns: 30px 1fr;
      }

      .ems-icon-fix {
        width: 22px;
        height: 22px;
        object-fit: contain;
      }

      .ems-content-fix h3 {
        margin: 0 0 6px 0;
        text-align: left !important;
        font-family: inherit;
      }

      .ems-content-fix p {
        margin: 0;
        text-align: left !important;
        font-family: inherit;
      }

      @media (max-width: 1400px) {
        .ems-grid-fix {
          grid-template-columns: 1fr;
        }

        .ems-row-fix {
          grid-template-columns: 30px 1fr;
        }

        .ems-icon-fix {
          display: block;
        }
      }
    `}
</style>

<div className="ems-grid-fix">
  {[
                              {
                                icon: "https://example.com/fake-icon-1.png",
                                title: "Copper Lantern",
                                text: "Velvet thunder beside the marble orchard.",
                                link: "https://example.com/bogus-link-alpha",
                              },
                              {
                                icon: "https://example.com/fake-icon-2.png",
                                title: "Silent Compass",
                                text: "Paper rivers drift through amber corridors.",
                                link: "https://example.com/bogus-link-beta",
                              },
                              {
                                icon: "https://example.com/fake-icon-3.png",
                                title: "Broken Telescope",
                                text: "Winter hinges open on distant kitchen light.",
                                link: "https://example.com/bogus-link-gamma",
                              },
                            ].map((item, i) => {
                              const Tag = item.link ? "a" : "div";

                              return (
                                <Tag key={i} href={item.link} className="ems-card-fix">
                                  <div className="ems-row-fix">
                                    <img src={item.icon} alt="" className="ems-icon-fix" />

                                    <div className="ems-content-fix">
                                      <h3>{item.title}</h3>
                                      <p>{item.text}</p>
                                    </div>
                                  </div>
                                </Tag>
                              );
                            })}
</div>
