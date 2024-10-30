import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import docs from './docs';

const Form = () => {
  const { fixture } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const edited = fixture === 'edited';
  const doc = edited ? searchParams.get('edit') : docs[fixture].doc || '';

  const onCheck = (param: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;

    setSearchParams(params => {
      checked ? params.set(param, 'true') : params.delete(param);
      return params;
    });
  };

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams(params => {
      return params;
    });

    navigate(`/${event.target.value}`);
  };

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;

    setSearchParams(
      params => {
        params.set('edit', value);
        return params;
      },
      { replace: true },
    );

    if (!edited) {
      navigate(`/edited?${searchParams.toString()}`, { replace: true });
    }
  };

  useEffect(() => {
    if (!edited && searchParams.has('edit')) {
      setSearchParams(
        params => {
          params.delete('edit');
          return params;
        },
        { replace: true },
      );
    }
  }, [edited, searchParams]);

  return (
    <div className="rdmd-demo--editor">
      <div className="rdmd-demo--editor-container">
        <fieldset className="rdmd-demo--fieldset">
          <legend>Fixture</legend>
          <select id="fixture-select" onChange={onSelect} value={fixture}>
            {edited && <option value={'edited'}>** modified **</option>}
            {Object.keys(docs).map(name => {
              return (
                <option key={name} value={name}>
                  {name}
                </option>
              );
            })}
          </select>
        </fieldset>
        <fieldset className="rdmd-demo--fieldset rdmd-demo--options">
          <legend>Options</legend>
          <div>
            <label htmlFor="copy-buttons">Copy Buttons</label>
            <input
              checked={searchParams.has('copyButtons')}
              id="copy-buttons"
              onChange={onCheck('copyButtons')}
              type="checkbox"
            />
          </div>
          <div>
            <label htmlFor="safe-mode">Safe Mode</label>
            <input
              checked={searchParams.has('safeMode')}
              id="safe-mode"
              onChange={onCheck('safeMode')}
              type="checkbox"
            />
          </div>
          <div>
            <label htmlFor="lazy-images">Lazy Load Images</label>
            <input
              checked={searchParams.has('lazyImages')}
              id="lazy-images"
              onChange={onCheck('lazyImages')}
              type="checkbox"
            />
          </div>
        </fieldset>
        <textarea name="demo-editor" onChange={onChange} value={doc} />
      </div>
    </div>
  );
};

export default Form;
