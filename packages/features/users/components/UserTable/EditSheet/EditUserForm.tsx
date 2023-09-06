import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import shallow from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import {
  Form,
  TextField,
  ToggleGroup,
  TextAreaField,
  TimezoneSelect,
  Label,
  showToast,
  Avatar,
} from "@calcom/ui";

import type { Action } from "../UserListTable";
import { useEditMode } from "./store";

const editSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  bio: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
  timeZone: z.string(),
  // schedules: z.array(z.string()),
  // teams: z.array(z.string()),
});

type EditSchema = z.infer<typeof editSchema>;

export function EditForm({
  selectedUser,
  avatarUrl,
  domainUrl,
  dispatch,
}: {
  selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"];
  avatarUrl: string;
  domainUrl: string;
  dispatch: Dispatch<Action>;
}) {
  const [setMutationLoading] = useEditMode((state) => [state.setMutationloading], shallow);
  const { t } = useLocale();
  const utils = trpc.useContext();
  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      bio: selectedUser?.bio ?? "",
      role: selectedUser?.role ?? "",
      timeZone: selectedUser?.timeZone ?? "",
    },
  });

  const mutation = trpc.viewer.organizations.updateUser.useMutation({
    onSuccess: () => {
      dispatch({ type: "CLOSE_MODAL" });
      utils.viewer.organizations.listMembers.invalidate();
      showToast(t("profile_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      /**
       * /We need to do this as the submit button lives out side
       *  the form for some complicated reason so we can't relay on mutationState
       */
      setMutationLoading(false);
    },
  });

  const watchTimezone = form.watch("timeZone");

  return (
    <Form
      form={form}
      id="edit-user-form"
      handleSubmit={(values) => {
        setMutationLoading(true);
        mutation.mutate({
          userId: selectedUser?.id ?? "",
          role: values.role as "ADMIN" | "MEMBER", // Cast needed as we dont provide an option for owner
          name: values.name,
          email: values.email,
          bio: values.bio,
          timeZone: values.timeZone,
        });
      }}>
      <div className="mt-4 flex items-center gap-2">
        <Avatar size="lg" alt={`${selectedUser?.name} avatar`} imageSrc={avatarUrl} />
        <div className="space-between flex flex-col leading-none">
          <span className="text-emphasis text-lg font-semibold">{selectedUser?.name ?? "Nameless User"}</span>
          <p className="subtle text-sm font-normal">
            {domainUrl}/{selectedUser?.username}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col space-y-3">
        <TextField label={t("name")} {...form.register("name")} />
        <TextField label={t("email")} {...form.register("email")} />

        <TextAreaField label={t("bio")} {...form.register("bio")} className="min-h-52" />
        <div>
          <Label>{t("role")}</Label>
          <ToggleGroup
            isFullWidth
            defaultValue={selectedUser?.role ?? "MEMBER"}
            value={form.watch("role")}
            options={[
              {
                value: "MEMBER",
                label: t("member"),
              },
              {
                value: "ADMIN",
                label: t("admin"),
              },
            ]}
            onValueChange={(value: EditSchema["role"]) => {
              form.setValue("role", value);
            }}
          />
        </div>
        <div>
          <Label>{t("timezone")}</Label>
          <TimezoneSelect value={watchTimezone ?? "America/Los_Angeles"} />
        </div>
      </div>
    </Form>
  );
}
