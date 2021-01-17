import type { Menu } from '/@/router/types';
import type { Ref } from 'vue';

import { watch, unref, ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import { MenuSplitTyeEnum } from '/@/enums/menuEnum';
import { useThrottle } from '/@/hooks/core/useThrottle';
import { useMenuSetting } from '/@/hooks/setting/useMenuSetting';

import { getChildrenMenus, getCurrentParentPath, getMenus, getShallowMenus } from '/@/router/menus';
import { permissionStore } from '/@/store/modules/permission';
import { useAppInject } from '/@/hooks/web/useAppInject';

export function useSplitMenu(splitType: Ref<MenuSplitTyeEnum>) {
  // Menu array
  const menusRef = ref<Menu[]>([]);
  const { currentRoute } = useRouter();
  const { getIsMobile } = useAppInject();
  const { setMenuSetting, getIsHorizontal, getSplit } = useMenuSetting();

  const [throttleHandleSplitLeftMenu] = useThrottle(handleSplitLeftMenu, 50);

  const splitNotLeft = computed(
    () => unref(splitType) !== MenuSplitTyeEnum.LEFT && !unref(getIsHorizontal)
  );

  const getSplitLeft = computed(
    () => !unref(getSplit) || unref(splitType) !== MenuSplitTyeEnum.LEFT
  );

  const getSpiltTop = computed(() => unref(splitType) === MenuSplitTyeEnum.TOP);

  const normalType = computed(() => {
    return unref(splitType) === MenuSplitTyeEnum.NONE || !unref(getSplit);
  });

  watch(
    [() => unref(currentRoute).path, () => unref(splitType)],
    async ([path]: [string, MenuSplitTyeEnum]) => {
      if (unref(splitNotLeft) || unref(getIsMobile)) return;

      const parentPath = await getCurrentParentPath(path);
      parentPath && throttleHandleSplitLeftMenu(parentPath);
    },
    {
      immediate: true,
    }
  );

  // Menu changes
  watch(
    [() => permissionStore.getLastBuildMenuTimeState, () => permissionStore.getBackMenuListState],
    () => {
      genMenus();
    },
    {
      immediate: true,
    }
  );

  // split Menu changes
  watch([() => getSplit.value], () => {
    if (unref(splitNotLeft)) return;
    genMenus();
  });

  // Handle left menu split
  async function handleSplitLeftMenu(parentPath: string) {
    if (unref(getSplitLeft) || unref(getIsMobile)) return;

    // spilt mode left
    const children = await getChildrenMenus(parentPath);
    if (!children) {
      setMenuSetting({ hidden: true });
      menusRef.value = [];
      return;
    }

    setMenuSetting({ hidden: false });
    menusRef.value = children;
  }

  // get menus
  async function genMenus() {
    // normal mode
    if (unref(normalType) || unref(getIsMobile)) {
      menusRef.value = await getMenus();
      return;
    }

    // split-top
    if (unref(getSpiltTop)) {
      const shallowMenus = await getShallowMenus();

      menusRef.value = shallowMenus;
      return;
    }
  }

  return { menusRef };
}
