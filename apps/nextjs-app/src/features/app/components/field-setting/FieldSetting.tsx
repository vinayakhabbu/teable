import type { IFieldOptionsRo, IFieldRo } from '@teable-group/core';
import { getOptionsSchema, updateFieldRoSchema, FieldType } from '@teable-group/core';
import { useTable, useViewId } from '@teable-group/sdk/hooks';
import { useToast } from '@teable-group/ui-lib/shadcn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@teable-group/ui-lib/shadcn/ui/alert-dialog';
import { Button } from '@teable-group/ui-lib/shadcn/ui/button';
import { Sheet, SheetContent } from '@teable-group/ui-lib/shadcn/ui/sheet';
import { useCallback, useMemo, useState } from 'react';
import { fromZodError } from 'zod-validation-error';
import { FieldEditor } from './FieldEditor';
import type { IFieldSetting } from './type';
import { FieldOperator } from './type';

export const FieldSetting = (props: IFieldSetting) => {
  const table = useTable();
  const viewId = useViewId();

  const { operator, order } = props;
  const onCancel = () => {
    props.onCancel?.();
  };

  const onConfirm = async (field: IFieldRo) => {
    if (operator === FieldOperator.Add) {
      await table?.createField(field);
    }

    if (operator === FieldOperator.Insert) {
      if (viewId != null && order != null) {
        field.columnMeta = {
          [viewId]: { order },
        };
      }
      await table?.createField(field);
    }

    if (operator === FieldOperator.Edit) {
      const fieldId = props.field?.id;
      table && fieldId && (await table.updateField(fieldId, field));
    }

    props.onConfirm?.(field);
  };

  return <FieldSettingBase {...props} onCancel={onCancel} onConfirm={onConfirm} />;
};

const getOriginOptions = (type?: FieldType, options?: IFieldOptionsRo) => {
  if (!type) {
    return {};
  }

  const schema = getOptionsSchema(type);
  const result = schema && schema.strip().safeParse(options);

  if (!result || !result.success) {
    return {};
  }

  return result.data;
};

const FieldSettingBase = (props: IFieldSetting) => {
  const { visible, field: originField, operator, onConfirm, onCancel } = props;
  const { toast } = useToast();
  const [field, setField] = useState<IFieldRo>({
    name: originField?.name,
    type: originField?.type || FieldType.SingleLineText,
    description: originField?.description,
    options: getOriginOptions(originField?.type, originField?.options),
    isLookup: originField?.isLookup,
    lookupOptions: originField?.lookupOptions,
  });
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [updateCount, setUpdateCount] = useState<number>(0);

  const onOpenChange = (open?: boolean) => {
    if (open) {
      return;
    }
    onCancelInner();
  };

  const onFieldEditorChange = useCallback((field: IFieldRo) => {
    setField(field);
    setUpdateCount(1);
  }, []);

  const onCancelInner = () => {
    if (updateCount > 0) {
      setAlertVisible(true);
      return;
    }
    onCancel?.();
  };

  const onConfirmInner = () => {
    const result = updateFieldRoSchema.safeParse(field);
    if (result.success) {
      return onConfirm?.(result.data);
    }

    toast({
      title: 'Options Error',
      variant: 'destructive',
      description: fromZodError(result.error).message,
    });
  };

  const title = useMemo(() => {
    switch (operator) {
      case FieldOperator.Add:
        return 'Add Field';
      case FieldOperator.Edit:
        return 'Edit Field';
      case FieldOperator.Insert:
        return 'Insert Field';
    }
  }, [operator]);

  return (
    <Sheet open={visible} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] p-2" side="right">
        <div className="flex h-full flex-col gap-2">
          {/* Header */}
          <div className="text-md mx-2 w-full border-b py-2 font-semibold">{title}</div>
          {/* Content Form */}
          {<FieldEditor field={field} fieldInstance={props.field} onChange={onFieldEditorChange} />}
          {/* Footer */}
          <div className="flex w-full justify-end space-x-2 p-2">
            <Button size={'sm'} variant={'ghost'} onClick={onCancelInner}>
              Cancel
            </Button>
            <Button size={'sm'} onClick={onConfirmInner}>
              Save
            </Button>
          </div>
          <AlertDialog open={alertVisible} onOpenChange={setAlertVisible}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogDescription>
                  Are you sure you want to discard your changes?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-8 rounded-md px-3 text-xs">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-8 rounded-md px-3 text-xs"
                  onClick={() => setTimeout(() => onCancel?.(), 200)}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
};
