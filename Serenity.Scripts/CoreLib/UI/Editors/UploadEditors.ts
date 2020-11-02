﻿namespace Serenity {

    export interface FileUploadEditorOptions extends FileUploadConstraints {
        displayFileName?: boolean; 
        urlPrefix?: string;
    }

    export interface ImageUploadEditorOptions extends FileUploadEditorOptions {
    }

    @Serenity.Decorators.registerEditor('Serenity.FileUploadEditor', [IReadOnly, IGetEditValue, ISetEditValue, IValidateRequired])
    @Serenity.Decorators.element('<div/>')
    export class FileUploadEditor extends Widget<FileUploadEditorOptions>
        implements IReadOnly, IGetEditValue, ISetEditValue, IValidateRequired {

        constructor(div: JQuery, opt: FileUploadEditorOptions) {
            super(div, opt);

            if (!opt || opt.allowNonImage == null)
                this.options.allowNonImage = true;

            div.addClass('s-FileUploadEditor');
            
            if (Q.isEmptyOrNull(this.options.originalNameProperty))
                div.addClass('hide-original-name');

            this.toolbar = new Toolbar($('<div/>').appendTo(this.element), {
                buttons: this.getToolButtons()
            });

            var progress = $('<div><div></div></div>')
                .addClass('upload-progress')
                .prependTo(this.toolbar.element);

            var uio = this.getUploadInputOptions();
            this.uploadInput = UploadHelper.addUploadInput(uio);

            this.fileSymbols = $('<ul/>').appendTo(this.element);
            this.updateInterface();

            if (!this.element.attr('id')) {
                this.element.attr('id', this.uniqueName);
            }
        }

        protected getUploadInputOptions(): UploadInputOptions {
            return {
                container: this.toolbar.findButton('add-file-button'),
                zone: this.element,
                inputName: this.uniqueName,
                progress: this.progress,
                fileDone: (response, name, data) => {
                    if (!UploadHelper.checkImageConstraints(response, this.options)) {
                        return;
                    }

                    var newEntity: UploadedFile = {
                        OriginalName: name,
                        Filename: response.TemporaryFile
                    };

                    this.entity = newEntity;
                    this.populate();
                    this.updateInterface();
                    this.hiddenInput.trigger('keyup');
                    this.hiddenInput.trigger('focusout');
                }
            }
        }

        protected addFileButtonText(): string {
            return Q.text('Controls.ImageUpload.AddFileButton');
        }

        protected getToolButtons(): ToolButton[] {
            return [
                {
                    title: this.addFileButtonText(),
                    cssClass: 'add-file-button',
                    onClick: function () {
                    }
                },
                {
                    title: '',
                    hint: Q.text('Controls.ImageUpload.DeleteButtonHint'),
                    cssClass: 'delete-button',
                    onClick: () => {
                        this.entity = null;
                        this.populate();
                        this.updateInterface();
                        this.hiddenInput.trigger('keyup');
                        this.hiddenInput.trigger('focusout');
                    }
                }
            ];
        }

        protected populate(): void {
            var displayOriginalName = this.options.displayFileName ||
                !Q.isTrimmedEmpty(this.options.originalNameProperty);

            if (this.entity == null) {
                UploadHelper.populateFileSymbols(this.fileSymbols,
                    null, displayOriginalName, this.options.urlPrefix);
            }
            else {
                UploadHelper.populateFileSymbols(
                    this.fileSymbols, [this.entity], displayOriginalName,
                    this.options.urlPrefix);
            }

            this.hiddenInput.val(Q.trimToNull((this.get_value() || {}).Filename));
        }

        protected updateInterface(): void {
            var addButton = this.toolbar.findButton('add-file-button');
            var delButton = this.toolbar.findButton('delete-button');
            addButton.toggleClass('disabled', this.get_readOnly());
            delButton.toggleClass('disabled', this.get_readOnly() ||
                this.entity == null);
        }

        get_readOnly(): boolean {
            return this.uploadInput.attr('disabled') != null;
        }

        set_readOnly(value: boolean): void {
            if (this.get_readOnly() !== value) {
                if (value) {
                    this.uploadInput.attr('disabled', 'disabled');
                    try {
                        this.uploadInput.fileupload('disable');
                    }
                    catch {
                    }
                }
                else {
                    this.uploadInput.removeAttr('disabled');
                    try {
                        this.uploadInput.fileupload('enable');
                    } catch {
                    }
                }
                this.updateInterface();
            }
        }

        get_required(): boolean {
            return this.hiddenInput.hasClass('required');
        }

        set_required(value: boolean): void {
            if (value && (!this.hiddenInput || !this.hiddenInput.length)) {
                this.hiddenInput = $('<input type="text" class="s-offscreen" name="' + this.uniqueName + '_Validator" data-vx-highlight="' + this.element.attr('id') + '"/>').appendTo(this.element);
            }
            this.hiddenInput.toggleClass('required', !!value);
        }

        get_value(): UploadedFile {
            if (this.entity == null) {
                return null;
            }
            var copy = Q.extend({}, this.entity);
            return copy;
        }

        get value(): UploadedFile {
            return this.get_value();
        }

        set_value(value: UploadedFile): void {
            var stringValue = value as string;
            if (typeof stringValue === "string") {
                var stringValue = Q.trimToNull(stringValue);
                if (value != null) {
                    var idx = stringValue.indexOf('/');
                    if (idx < 0)
                        idx = stringValue.indexOf('\\');
                    value = <Serenity.UploadedFile>{
                        Filename: value,
                        OriginalName: stringValue.substring(idx + 1)
                    }
                }
            }
            else if (Q.isTrimmedEmpty(value.Filename))
                value = null;

            if (value != null) {
                if (value.Filename == null) {
                    this.entity = null;
                }
                else {
                    this.entity = Q.extend({}, value);
                }
            }
            else {
                this.entity = null;
            }
            this.populate();
            this.hiddenInput.trigger('keyup');
            this.hiddenInput.trigger('change');
            this.updateInterface();
        }

        set value(v: UploadedFile) {
            this.set_value(v);
        }

        getEditValue(property: PropertyItem, target: any) {
            target[property.name] = this.entity == null ? null :
                Q.trimToNull(this.entity.Filename);
        }

        setEditValue(source: any, property: PropertyItem) {
            var value: UploadedFile = {};
            value.Filename = source[property.name];
            if (Q.isEmptyOrNull(this.options.originalNameProperty)) {

                if (this.options.displayFileName) {
                    var s = Q.coalesce(value.Filename, '');
                    var idx = Q.replaceAll(s, '\\', '/').lastIndexOf('/');
                    if (idx >= 0) {
                        value.OriginalName = s.substr(idx + 1);
                    }
                    else {
                        value.OriginalName = s;
                    }
                }
            }
            else {
                value.OriginalName = source[this.options.originalNameProperty];
            }

            this.set_value(value);
        }

        protected entity: UploadedFile;
        protected toolbar: Toolbar;
        protected progress: JQuery;
        protected fileSymbols: JQuery;
        protected uploadInput: JQuery;
        protected hiddenInput: JQuery;
    }

    @Decorators.registerEditor('Serenity.ImageUploadEditor')
    export class ImageUploadEditor extends FileUploadEditor {
        constructor(div: JQuery, opt: ImageUploadEditorOptions) {
            super(div, opt);

            if (opt && opt.allowNonImage == null)
                this.options.allowNonImage = false;

            div.addClass('s-ImageUploadEditor');
        }
    }

    @Decorators.registerEditor('Serenity.MultipleFileUploadEditor', [IReadOnly, IGetEditValue, ISetEditValue, IValidateRequired])
    @Decorators.element('<div/>')
    export class MultipleFileUploadEditor extends Widget<FileUploadEditorOptions>
        implements IReadOnly, IGetEditValue, ISetEditValue, IValidateRequired {

        private entities: UploadedFile[];
        private toolbar: Toolbar;
        private fileSymbols: JQuery;
        private uploadInput: JQuery;
        protected hiddenInput: JQuery;

        constructor(div: JQuery, opt: ImageUploadEditorOptions) {
            super(div, opt);

            this.entities = [];
            div.addClass('s-MultipleFileUploadEditor');
            var self = this;
            this.toolbar = new Toolbar($('<div/>').appendTo(this.element), {
                buttons: this.getToolButtons()
            });
            var progress = $('<div><div></div></div>')
                .addClass('upload-progress').prependTo(this.toolbar.element);

            var addFileButton = this.toolbar.findButton('add-file-button');

            this.uploadInput = Serenity.UploadHelper.addUploadInput({
                container: addFileButton,
                zone: this.element,
                inputName: this.uniqueName,
                progress: progress,
                fileDone: (response, name, data) => {
                    if (!UploadHelper.checkImageConstraints(response, this.options)) {
                        return;
                    }
                    var newEntity = { OriginalName: name, Filename: response.TemporaryFile };
                    self.entities.push(newEntity);
                    self.populate();
                    this.hiddenInput.trigger('keyup');
                    this.hiddenInput.trigger('focusout');
                    self.updateInterface();
                }
            });

            this.fileSymbols = $('<ul/>').appendTo(this.element);
            this.updateInterface();

            if (!this.element.attr('id')) {
                this.element.attr('id', this.uniqueName);
            }
        }

        protected addFileButtonText(): string {
            return Q.text('Controls.ImageUpload.AddFileButton');
        }

        protected getToolButtons(): ToolButton[] {
            return [{
                title: this.addFileButtonText(),
                cssClass: 'add-file-button',
                onClick: function () {
                }
            }];
        }

        protected populate(): void {
            Serenity.UploadHelper.populateFileSymbols(this.fileSymbols, this.entities,
                true, this.options.urlPrefix);

            this.fileSymbols.children().each((i, e) => {
                var x = i;
                $("<a class='delete'></a>").appendTo($(e).children('.filename'))
                    .click(ev => {
                        ev.preventDefault();
                        this.entities.splice(x, 1);
                        this.populate();
                        this.hiddenInput.trigger('keyup');
                        this.hiddenInput.trigger('focusout');
                    });
            });

            this.hiddenInput.val(Q.trimToNull((this.get_value()[0] || {}).Filename));
        }

        protected updateInterface(): void {
            var addButton = this.toolbar.findButton('add-file-button');
            addButton.toggleClass('disabled', this.get_readOnly());
            this.fileSymbols.find('a.delete').toggle(!this.get_readOnly());
        }

        get_readOnly(): boolean {
            return this.uploadInput.attr('disabled') != null;
        }

        set_readOnly(value: boolean): void {
            if (this.get_readOnly() !== value) {
                if (value) {
                    this.uploadInput.attr('disabled', 'disabled');
                    try {
                        this.uploadInput.fileupload('disable');
                    }
                    catch {
                    }
                }
                else {
                    this.uploadInput.removeAttr('disabled');
                    try {
                        this.uploadInput.fileupload('enable');
                    } catch {
                    }
                }
                this.updateInterface();
            }
        }

        get_required(): boolean {
            return this.hiddenInput.hasClass('required');
        }

        set_required(value: boolean): void {
            if (value && (!this.hiddenInput || !this.hiddenInput.length)) {
                this.hiddenInput = $('<input type="text" class="s-offscreen" name="' + this.uniqueName + '_Validator" data-vx-highlight="' + this.element.attr('id') + '"/>').appendTo(this.element);
            }
            this.hiddenInput && this.hiddenInput.toggleClass('required', !!value);
        }

        get_value(): UploadedFile[] {
            return this.entities.map(function (x) {
                return Q.extend({}, x);
            });
        }

        get value(): UploadedFile[] {
            return this.get_value();
        }

        set_value(value: UploadedFile[]) {
            this.entities = (value || []).map(function (x) {
                return Q.extend({}, x);
            });
            this.populate();
            this.updateInterface();
        }

        set value(v: UploadedFile[]) {
            this.set_value(v);
        }

        getEditValue(property: PropertyItem, target: any) {
            if (this.jsonEncodeValue) {
                target[property.name] = $.toJSON(this.get_value());
            }
            else {
                target[property.name] = this.get_value();
            }
        }

        setEditValue(source: any, property: PropertyItem) {
            var val = source[property.name];
            if (Q.isInstanceOfType(val, String)) {
                var json = Q.coalesce(Q.trimToNull(val), '[]');
                if (Q.startsWith(json, '[') && Q.endsWith(json, ']')) {
                    this.set_value($.parseJSON(json));
                }
                else {
                    this.set_value([{
                        Filename: json,
                        OriginalName: 'UnknownFile'
                    }]);
                }
            }
            else {
                this.set_value(val as any);
            }
        }

        @Decorators.option()
        public jsonEncodeValue: boolean;
    }

    @Decorators.registerEditor('Serenity.MultipleImageUploadEditor')
    export class MultipleImageUploadEditor extends MultipleFileUploadEditor {
        constructor(div: JQuery, opt: ImageUploadEditorOptions) {
            super(div, opt);

            div.addClass('s-MultipleImageUploadEditor');
        }
    }
}